/**
 * DictKing API 层 — 基于 @dtdyq/restbase-client 3.0
 *
 * RestBase 统一响应格式：{ code: "OK", data: T, pageNo?, pageSize?, total? }
 * 错误时 code 为非 "OK"（AUTH_ERROR / QUERY_ERROR / ...）
 */
import RestBase, { type ApiResponse, eq, like } from '@dtdyq/restbase-client';

/* ═══════════ RestBase 客户端实例 ═══════════ */

const rb = new RestBase(); // 同源部署，Vite proxy 转发 /api

// 从 localStorage 恢复 token
const savedToken = localStorage.getItem('auth_token');
if (savedToken) rb.auth.setToken(savedToken);

/* ═══════════ 工具函数 ═══════════ */

/** 从 JWT token 解析 payload（不验签，仅解码） */
function decodeJwt(token: string): { sub: string; uid: number; iat: number; exp: number } {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

/**
 * 统一错误守卫 — 检查 RestBase 响应码
 * - code !== "OK" → 抛出错误
 * - AUTH_ERROR + 非鉴权接口 → 清除本地状态并跳转登录页
 */
async function guard<T>(promise: Promise<ApiResponse<T>>, skipAuthRedirect = false): Promise<ApiResponse<T>> {
  const res = await promise;
  if (res.code !== 'OK') {
    if (res.code === 'AUTH_ERROR' && !skipAuthRedirect) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const err: any = new Error(res.message || res.code);
    err.rbCode = res.code;
    err.response = { data: res };
    throw err;
  }
  return res;
}

/* ═══════════ 认证 API ═══════════ */

export const authAPI = {
  /** 注册 → 返回 { token, user } */
  async register(username: string, password: string) {
    const res = await guard(rb.auth.register(username, password), true);
    const token = res.data;
    localStorage.setItem('auth_token', token);
    const profileRes = await guard(rb.auth.getProfile());
    const profile = profileRes.data as any;
    const user = {
      id: decodeJwt(token).uid,
      username: profile.username,
      current_dict: profile.current_dict || 'defaults',
      created_at: profile.created_at,
    };
    return { data: { token, user } };
  },

  /** 登录 → 返回 { token, user } */
  async login(username: string, password: string) {
    const res = await guard(rb.auth.login(username, password), true);
    const token = res.data;
    localStorage.setItem('auth_token', token);
    const profileRes = await guard(rb.auth.getProfile());
    const profile = profileRes.data as any;
    const user = {
      id: decodeJwt(token).uid,
      username: profile.username,
      current_dict: profile.current_dict || 'defaults',
      created_at: profile.created_at,
    };
    return { data: { token, user } };
  },

  /** 获取当前用户信息 */
  async getMe() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No token');
    const res = await guard(rb.auth.getProfile());
    const profile = res.data as any;
    const { uid } = decodeJwt(token);
    return { data: { user: { id: uid, ...profile } } };
  },

  /** 更新当前词典 */
  async updateCurrentDict(dictId: string) {
    await guard(rb.auth.updateProfile({ current_dict: dictId }));
    return { data: { success: true, currentDict: dictId } };
  },
};

/* ═══════════ 词典 API ═══════════ */

export const dictionaryAPI = {
  /** 获取所有词典 */
  async getAll() {
    const res = await guard(rb.table('dictionaries').query().exec());
    return { data: res.data || [] };
  },

  /** 获取单个词典 */
  async getOne(id: string) {
    const res = await guard(rb.table('dictionaries').get(id));
    return { data: res.data };
  },
};

/* ═══════════ 单词 API ═══════════ */

export const wordAPI = {
  /**
   * 获取词典的单词列表（分页 + 搜索 + 排序）
   * 返回格式与旧 API 一致：{ words, total, page, pageSize, hasMore }
   */
  async getList(dictId: string, params?: { page?: number; pageSize?: number; search?: string; order?: string }) {
    const p = params || {};
    const pageNo = p.page || 1;
    const pageSize = p.pageSize || 20;
    const order = p.order || 'word_asc';

    const q = rb.table('words').query()
      .select('word', 'brief')
      .where(eq('dictionary_id', dictId));

    if (p.search) {
      q.where(like('word', `%${p.search}%`));
    }

    switch (order) {
      case 'word_asc':  q.orderAsc('word'); break;
      case 'word_desc': q.orderDesc('word'); break;
      case 'time_asc':  q.orderAsc('created_at'); break;
      case 'time_desc': q.orderDesc('created_at'); break;
      case 'random':    q.orderAsc('id'); break;
    }

    if (!p.search) {
      q.page(pageNo, pageSize);
    } else {
      q.page(1, 1000);
    }

    const res = await guard(q.exec());
    let rows: any[] = res.data || [];
    const total = res.total || rows.length;

    // 如果是随机排序，前端打乱
    if (order === 'random') {
      rows = rows.sort(() => Math.random() - 0.5);
    }

    // 转换为旧格式
    const words = rows.map((r: any) => ({
      word: r.word,
      summary: r.brief || '暂无释义',
    }));

    return {
      data: {
        words,
        total,
        page: pageNo,
        pageSize,
        hasMore: !p.search && (pageNo * pageSize < total),
      },
    };
  },

  /** 获取单词详情（返回 wordData JSON） */
  async getDetail(dictId: string, word: string) {
    const res = await guard(
      rb.table('words').query()
        .where(eq('dictionary_id', dictId), eq('word', word))
        .page(1, 1)
        .exec()
    );
    const rows = res.data || [];
    if (rows.length === 0) {
      throw Object.assign(new Error('Word not found'), { response: { data: { error: 'Word not found' } } });
    }
    const row = rows[0] as any;
    const wordData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return { data: wordData };
  },

  /** 获取随机单词（基于权重） — 在前端实现 */
  async getRandom(dictId: string, excludeWords: string[] = []) {
    // 1. 只获取单词名称列表 + 用户权重（并行）
    const [wordsRes, wRes] = await Promise.all([
      guard(
        rb.table('words').query()
          .select('word')
          .where(eq('dictionary_id', dictId))
          .page(1, 1000)
          .exec()
      ),
      guard(
        rb.table('user_word_weights').query()
          .where(eq('dictionary_id', dictId))
          .page(1, 1000)
          .exec()
      ).catch(() => ({ code: 'OK' as const, data: [] as any[] })),
    ]);

    let allWords: any[] = wordsRes.data || [];
    if (allWords.length === 0) {
      throw Object.assign(new Error('No words in dictionary'), { response: { data: { error: '词典中没有单词' } } });
    }

    // 2. 排除最近出现过的单词
    const excludeSet = new Set(excludeWords);
    const filteredWords = allWords.filter((w: any) => !excludeSet.has(w.word));

    if (filteredWords.length >= Math.max(5, allWords.length * 0.3)) {
      allWords = filteredWords;
    }

    // 3. 构建权重映射
    const weights: any[] = wRes.data || [];
    const weightMap = new Map<string, number>(weights.map((w: any) => [w.word, w.weight]));

    // 4. 加权随机选择
    let totalWeight = 0;
    const wordWeights = allWords.map((w: any) => {
      const weight = weightMap.get(w.word) ?? 100;
      totalWeight += weight;
      return { word: w.word, weight };
    });

    let random = Math.random() * totalWeight;
    let selected = wordWeights[0];
    for (const item of wordWeights) {
      if (random < item.weight) {
        selected = item;
        break;
      }
      random -= item.weight;
    }

    // 5. 根据选中的单词查询完整详情
    const detailRes = await guard(
      rb.table('words').query()
        .where(eq('dictionary_id', dictId), eq('word', selected.word))
        .page(1, 1)
        .exec()
    );
    const detailRows = detailRes.data || [];
    if (detailRows.length === 0) {
      throw Object.assign(new Error('Word not found'), { response: { data: { error: '单词详情未找到' } } });
    }

    // 6. 记录历史（不阻塞主流程）
    rb.table('user_history').insert({ word: selected.word, dictionary_id: dictId }).catch(() => {});

    // 7. 返回完整 wordData
    const row = detailRows[0] as any;
    const wordData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return { data: wordData };
  },
};

/* ═══════════ 例句 API ═══════════ */

export const sentenceAPI = {
  /** 获取词典的所有例句 */
  async getAll(dictId: string) {
    const res = await guard(
      rb.table('sentences').query()
        .where(eq('dictionary_id', dictId))
        .page(1, 1000)
        .exec()
    );
    const rows: any[] = res.data || [];
    const sentences = rows.map((s: any) => {
      const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      return { id: s.id, en: data.en, zh: data.zh, keywords: data.keywords };
    });
    return { data: { sentences, count: sentences.length } };
  },

  /** 删除例句 */
  async delete(id: number) {
    await guard(rb.table('sentences').delete(id));
    return { data: { success: true } };
  },
};

/* ═══════════ 权重 API ═══════════ */

export const weightAPI = {
  /** 获取用户在某词典的权重 → { weights: Record<string, { id?, weight }> } */
  async getWeights(dictId: string) {
    const res = await guard(
      rb.table('user_word_weights').query()
        .where(eq('dictionary_id', dictId))
        .page(1, 1000)
        .exec()
    );
    const rows: any[] = res.data || [];
    const weights: Record<string, { id?: string; weight: number }> = {};
    rows.forEach((w: any) => {
      weights[w.word] = { id: w.id, weight: w.weight };
    });
    return { data: { weights } };
  },

  /** 批量更新权重（Upsert） */
  async updateWeights(dictId: string, weights: Record<string, { id?: string; weight: number }>) {
    const items = Object.entries(weights).map(([word, data]) => {
      const item: any = {
        dictionary_id: dictId,
        word,
        weight: data.weight,
      };
      if (data.id) {
        item.id = data.id;
      }
      return item;
    });
    if (items.length > 0) {
      const res = await guard(rb.table('user_word_weights').upsert(items));
      return { data: res.data };
    }
    return { data: { success: true, data: [] } };
  },
};

/* ═══════════ 文章 API ═══════════ */

/**
 * articles 表结构（全局，不按词典分）:
 *   id          int AUTO_INCREMENT
 *   title       varchar(512)
 *   title_cn    varchar(800)   — 中文标题
 *   tags        varchar(500)   — 逗号分隔的标签
 *   difficulty  varchar(20)    — easy / medium / hard
 *   content     MEDIUMTEXT     — JSON 格式的文章完整内容
 *   created_at  datetime(3)
 */
export const articleAPI = {
  /**
   * 获取文章列表（分页 + 搜索）
   * 返回格式：{ articles, total, page, pageSize, hasMore }
   */
  async getList(params?: { page?: number; pageSize?: number; search?: string }) {
    const p = params || {};
    const pageNo = p.page || 1;
    const pageSize = p.pageSize || 20;

    const q = rb.table('articles').query()
      .select('id', 'title', 'title_cn', 'tags', 'difficulty', 'created_at')
      .orderDesc('created_at')
      .page(pageNo, pageSize);

    if (p.search) {
      q.where(like('title', `%${p.search}%`));
    }

    const res = await guard(q.exec());
    const rows: any[] = res.data || [];
    const total = res.total || rows.length;

    const articles = rows.map((r: any) => ({
      id: r.id,
      title: r.title || '无标题',
      title_cn: r.title_cn || '',
      difficulty: r.difficulty || 'medium',
      tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      created_at: r.created_at || '',
    }));

    return {
      data: {
        articles,
        total,
        page: pageNo,
        pageSize,
        hasMore: pageNo * pageSize < total,
      },
    };
  },

  /** 获取文章详情（返回 content JSON） */
  async getDetail(articleId: number | string) {
    const res = await guard(
      rb.table('articles').query()
        .where(eq('id', articleId))
        .page(1, 1)
        .exec()
    );
    const rows = res.data || [];
    if (rows.length === 0) {
      throw Object.assign(new Error('Article not found'), { response: { data: { error: 'Article not found' } } });
    }
    const row = rows[0] as any;
    const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    return {
      data: {
        ...content,
        id: row.id,
        title: row.title,
        title_cn: row.title_cn || '',
        tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        difficulty: row.difficulty,
        created_at: row.created_at,
      },
    };
  },
};

export default rb;
