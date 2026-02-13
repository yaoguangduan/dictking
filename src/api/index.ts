/**
 * DictKing API 层 — 基于 RestBase REST 接口
 *
 * RestBase 统一响应格式：{ code: "OK", data: T, pageNo?, pageSize?, total? }
 * 错误时 code 为非 "OK"（AUTH_ERROR / QUERY_ERROR / ...）
 */
import RestBase from '@dtdyq/restbase-client';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

/* ═══════════ Axios 实例 ═══════════ */

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：添加 Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：RestBase 始终返回 200，需要检查 code 字段
api.interceptors.response.use((response) => {
  const body = response.data;
  // RestBase 业务错误（code !== "OK"）
  if (body && typeof body === 'object' && body.code && body.code !== 'OK') {
    // 鉴权错误 → 清除本地状态
    if (body.code === 'AUTH_ERROR') {
      const url = response.config.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    const err: any = new Error(body.message || body.code);
    err.rbCode = body.code;
    err.response = { data: body };
    return Promise.reject(err);
  }
  return response;
});

/* ═══════════ 工具函数 ═══════════ */

/** 从 RestBase 响应中提取 data 字段 */
function unwrap<T = any>(res: AxiosResponse): T {
  return res.data?.data as T;
}

/** 从 JWT token 解析 payload（不验签，仅解码） */
function decodeJwt(token: string): { sub: string; uid: number; iat: number; exp: number } {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

/* ═══════════ 认证 API ═══════════ */

export const authAPI = {
  /** 注册 → 返回 { token, user } */
  async register(username: string, password: string) {
    const res = await api.post('/auth/register', { username, password });
    const token = unwrap<string>(res);
    // 注册后立即设置 token，再获取 profile
    localStorage.setItem('auth_token', token);
    const profileRes = await api.get('/auth/profile');
    const profile = unwrap<any>(profileRes);
    const user = { id: decodeJwt(token).uid, username: profile.username, current_dict: profile.current_dict || 'defaults', created_at: profile.created_at };
    return { data: { token, user } };
  },

  /** 登录 → 返回 { token, user } */
  async login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    const token = unwrap<string>(res);
    localStorage.setItem('auth_token', token);
    const profileRes = await api.get('/auth/profile');
    const profile = unwrap<any>(profileRes);
    const user = { id: decodeJwt(token).uid, username: profile.username, current_dict: profile.current_dict || 'defaults', created_at: profile.created_at };
    return { data: { token, user } };
  },

  /** 获取当前用户信息 */
  async getMe() {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No token');
    const res = await api.get('/auth/profile');
    const profile = unwrap<any>(res);
    const { uid } = decodeJwt(token);
    return { data: { user: { id: uid, ...profile } } };
  },

  /** 更新当前词典 */
  async updateCurrentDict(dictId: string) {
    await api.post('/auth/profile', { current_dict: dictId });
    return { data: { success: true, currentDict: dictId } };
  },
};

/* ═══════════ 词典 API ═══════════ */

export const dictionaryAPI = {
  /** 获取所有词典 */
  async getAll() {
    const res = await api.get('/data/dictionaries');
    const dicts = unwrap<any[]>(res);
    return { data: dicts || [] };
  },

  /** 获取单个词典 */
  async getOne(id: string) {
    const res = await api.get(`/data/dictionaries/${encodeURIComponent(id)}`);
    return { data: unwrap<any>(res) };
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

    // 构建 where 条件
    const where: any[] = [['dictionary_id', dictId]];
    if (p.search) {
      where.push(['word', 'like', `%${p.search}%`]);
    }

    // 构建 order
    const orderArr: any[] = [];
    switch (order) {
      case 'word_asc':  orderArr.push({ field: 'word', dir: 'asc' }); break;
      case 'word_desc': orderArr.push({ field: 'word', dir: 'desc' }); break;
      case 'time_asc':  orderArr.push({ field: 'created_at', dir: 'asc' }); break;
      case 'time_desc': orderArr.push({ field: 'created_at', dir: 'desc' }); break;
      case 'random':    orderArr.push({ field: 'id', dir: 'asc' }); break; // 随机在前端实现
    }

    const body: any = {
      select: ['word', 'brief'],
      where,
      order: orderArr,
    };

    // 搜索模式不分页
    if (!p.search) {
      body.pageNo = pageNo;
      body.pageSize = pageSize;
    } else {
      body.pageSize = 1000;
    }

    const res = await api.post('/query/words', body);
    const resBody = res.data;
    let rows: any[] = resBody.data || [];
    const total = resBody.total || rows.length;

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
    const res = await api.post('/query/words', {
      where: [['dictionary_id', dictId], ['word', word]],
      pageSize: 1,
    });
    const rows = res.data?.data || [];
    if (rows.length === 0) {
      throw Object.assign(new Error('Word not found'), { response: { data: { error: 'Word not found' } } });
    }
    const row = rows[0];
    const wordData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return { data: wordData };
  },

  /** 获取随机单词（基于权重） — 在前端实现 */
  async getRandom(dictId: string) {
    // 1. 只获取单词名称列表（不查 data，避免全量返回几十 KB 数据）
    const [wordsRes, wRes] = await Promise.all([
      api.post('/query/words', {
        select: ['word'],
        where: [['dictionary_id', dictId]],
        pageSize: 1000,
      }),
      api.post('/query/user_word_weights', {
        where: [['dictionary_id', dictId]],
        pageSize: 1000,
      }).catch(() => ({ data: { data: [] } })),  // 无权重数据，使用空数组
    ]);

    const allWords: any[] = wordsRes.data?.data || [];
    if (allWords.length === 0) {
      throw Object.assign(new Error('No words in dictionary'), { response: { data: { error: '词典中没有单词' } } });
    }

    // 2. 构建权重映射
    const weights: any[] = wRes.data?.data || [];
    const weightMap = new Map<string, number>(weights.map((w: any) => [w.word, w.weight]));

    // 3. 加权随机选择
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

    // 4. 根据选中的单词查询完整详情（只查一条）
    const detailRes = await api.post('/query/words', {
      where: [['dictionary_id', dictId], ['word', selected.word]],
      pageSize: 1,
    });
    const detailRows = detailRes.data?.data || [];
    if (detailRows.length === 0) {
      throw Object.assign(new Error('Word not found'), { response: { data: { error: '单词详情未找到' } } });
    }

    // 5. 记录历史（不阻塞主流程）
    api.post('/data/user_history', { word: selected.word, dictionary_id: dictId }).catch(() => {});

    // 6. 返回完整 wordData
    const row = detailRows[0];
    const wordData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return { data: wordData };
  },
};

/* ═══════════ 例句 API ═══════════ */

export const sentenceAPI = {
  /** 获取词典的所有例句 */
  async getAll(dictId: string) {
    const res = await api.post('/query/sentences', {
      where: [['dictionary_id', dictId]],
      pageSize: 1000,
    });
    const rows: any[] = res.data?.data || [];
    const sentences = rows.map((s: any) => {
      const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      return { id: s.id, en: data.en, zh: data.zh, keywords: data.keywords };
    });
    return { data: { sentences, count: sentences.length } };
  },

  /** 删除例句 */
  async delete(id: number) {
    await api.delete(`/data/sentences/${id}`);
    return { data: { success: true } };
  },
};

/* ═══════════ 权重 API ═══════════ */

export const weightAPI = {
  /** 获取用户在某词典的权重 → { weights: Record<string, number> } */
  async getWeights(dictId: string) {
    const res = await api.post('/query/user_word_weights', {
      where: [['dictionary_id', dictId]],
      pageSize: 1000,
    });
    const rows: any[] = res.data?.data || [];
    const weights: Record<string, number> = {};
    rows.forEach((w: any) => { weights[w.word] = w.weight; });
    return { data: { weights } };
  },

  /** 批量更新权重（Upsert） */
  async updateWeights(dictId: string, weights: Record<string, number>) {
    const items = Object.entries(weights).map(([word, weight]) => ({
      dictionary_id: dictId,
      word,
      weight,
    }));
    if (items.length > 0) {
      await api.put('/data/user_word_weights', items);
    }
    return { data: { success: true } };
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

    const where: any[] = [];
    if (p.search) {
      where.push(['title', 'like', `%${p.search}%`]);
    }

    const body: any = {
      select: ['id', 'title', 'title_cn', 'tags', 'difficulty', 'created_at'],
      order: [{ field: 'created_at', dir: 'desc' }],
      pageNo,
      pageSize,
    };
    if (where.length > 0) {
      body.where = where;
    }

    const res = await api.post('/query/articles', body);
    const resBody = res.data;
    const rows: any[] = resBody.data || [];
    const total = resBody.total || rows.length;

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
    const res = await api.post('/query/articles', {
      where: [['id', articleId]],
      pageSize: 1,
    });
    const rows = res.data?.data || [];
    if (rows.length === 0) {
      throw Object.assign(new Error('Article not found'), { response: { data: { error: 'Article not found' } } });
    }
    const row = rows[0];
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

export default api;
