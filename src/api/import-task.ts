/**
 * 单词导入任务 & 用户词典 API — 基于 RestBase
 */
import api from './index';

export type ImportTaskStatus = 'querying' | 'ready' | 'imported' | 'failed';

export interface FrontendImportTask {
  id: number;
  word: string;
  status: ImportTaskStatus;
  error_message: string | null;
  imported_dict_id: string | null;
  created_at: string;
  updated_at: string;
  imported_at: string | null;
  word_data?: any;
}

export interface FrontendDictionary {
  id: string;
  name: string;
  description: string | null;
  creator_id: number | null;
  is_public: 0 | 1;
  created_at: string;
  updated_at: string;
}

/* ═══════════ 百炼 AI 配置 ═══════════ */
// ⚠️ 安全提醒：API Key 暴露在前端代码中有安全风险
// 生产环境建议通过独立代理服务调用，此处仅为演示

const BAILIAN_API_KEY = import.meta.env.VITE_BAILIAN_API_KEY || '';
const BAILIAN_APP_ID = import.meta.env.VITE_BAILIAN_APP_ID || '';

/** 调用百炼 API 查询单词 */
async function queryWordFromBaiLian(word: string): Promise<any> {
  if (!BAILIAN_API_KEY || !BAILIAN_APP_ID) {
    throw new Error('未配置百炼 API（VITE_BAILIAN_API_KEY / VITE_BAILIAN_APP_ID）');
  }
  const url = `https://dashscope.aliyuncs.com/api/v1/apps/${BAILIAN_APP_ID}/completion`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BAILIAN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: { prompt: word }, parameters: {} }),
  });
  if (!resp.ok) throw new Error(`百炼 API HTTP ${resp.status}`);
  const json = await resp.json();
  if (!json?.output?.text) throw new Error('百炼 API 返回格式不正确');
  const wordData = JSON.parse(json.output.text);
  if (!wordData?.word || !wordData?.definitions?.length) {
    throw new Error('单词数据不完整');
  }
  if (!wordData.created_at) wordData.created_at = new Date().toISOString();
  return wordData;
}

/** 从 RestBase 响应中提取 data */
function unwrap<T = any>(res: any): T {
  return res.data?.data as T;
}

/* ═══════════ 导入任务 API ═══════════ */

export const importTaskAPI = {
  /**
   * 创建导入任务
   * 1. 检查是否已有相同单词的任务（前端查询）
   * 2. 创建 status=querying 的记录
   * 3. 异步调用百炼 API，成功后更新为 ready
   */
  async create(word: string) {
    // 检查是否已存在
    const checkRes = await api.post('/query/word_import_tasks', {
      where: [['word', word]],
      pageSize: 1,
    });
    const existing = (checkRes.data?.data || [])[0];
    if (existing) {
      if (existing.status === 'failed') {
        // 失败的任务 → 重新查询
        await api.put('/data/word_import_tasks', [{ id: existing.id, status: 'querying', error_message: null }]);
        _queryWordAsync(existing.id, word);
        return { data: { success: true, taskId: existing.id, message: '正在重新查询...' } };
      }
      throw Object.assign(new Error('该单词的导入任务已存在'), {
        response: { data: { error: '该单词的导入任务已存在', taskId: existing.id, status: existing.status } }
      });
    }

    // 创建任务
    const createRes = await api.post('/data/word_import_tasks', { word, status: 'querying' });
    const created = createRes.data?.data?.created;
    const taskId = created?.[0];

    // 异步查询百炼
    _queryWordAsync(taskId, word);

    return { data: { success: true, taskId, message: '任务已创建，正在查询中...' } };
  },

  /** 批量创建任务 */
  async batchCreate(words: string[]) {
    const results = { created: [] as any[], existing: [] as any[], failed: [] as any[] };

    for (const word of words) {
      try {
        const checkRes = await api.post('/query/word_import_tasks', {
          where: [['word', word]],
          pageSize: 1,
        });
        const existing = (checkRes.data?.data || [])[0];
        if (existing) {
          results.existing.push({ word, taskId: existing.id });
          continue;
        }
        const createRes = await api.post('/data/word_import_tasks', { word, status: 'querying' });
        const taskId = createRes.data?.data?.created?.[0];
        results.created.push({ word, taskId });
        _queryWordAsync(taskId, word);
      } catch (e: any) {
        results.failed.push({ word, error: e.message });
      }
    }

    return { data: { success: true, results } };
  },

  /** 获取任务列表 */
  async getList(status: ImportTaskStatus | null = null) {
    const where: any[] = [];
    if (status) where.push(['status', status]);
    const res = await api.post('/query/word_import_tasks', {
      where: where.length ? where : undefined,
      order: [{ field: 'created_at', dir: 'desc' }],
      pageSize: 500,
    });
    // 去掉大字段 word_data 减少传输
    const tasks = (res.data?.data || []).map((t: any) => {
      const { word_data, ...rest } = t;
      return rest;
    });
    return { data: { tasks } };
  },

  /** 获取任务详情 */
  async getDetail(id: number) {
    const res = await api.get(`/data/word_import_tasks/${id}`);
    const task = unwrap<any>(res);
    // 解析 word_data
    if (task && task.word_data && typeof task.word_data === 'string') {
      task.word_data = JSON.parse(task.word_data);
    }
    return { data: { task } };
  },

  /** 录入单词到词典 */
  async import(id: number, dictId: string) {
    // 获取任务详情
    const detailRes = await api.get(`/data/word_import_tasks/${id}`);
    const task = unwrap<any>(detailRes);
    if (!task || task.status !== 'ready') {
      throw Object.assign(new Error('任务状态不正确'), { response: { data: { error: '任务状态不正确' } } });
    }

    const wordData = typeof task.word_data === 'string' ? JSON.parse(task.word_data) : task.word_data;
    if (!wordData) {
      throw Object.assign(new Error('单词数据不完整'), { response: { data: { error: '单词数据不完整' } } });
    }

    // 生成 brief
    const brief = (wordData.definitions || [])
      .slice(0, 3)
      .map((d: any) => d.translation)
      .filter(Boolean)
      .join('；');

    // Upsert 单词到目标词典
    await api.put('/data/words', [{
      word: wordData.word,
      dictionary_id: dictId,
      data: wordData,
      brief,
    }]);

    // 更新任务状态
    await api.put('/data/word_import_tasks', [{
      id,
      status: 'imported',
      imported_dict_id: dictId,
      imported_at: new Date().toISOString(),
    }]);

    return { data: { success: true, message: '单词已成功录入词典' } };
  },

  /** 删除任务 */
  async delete(id: number) {
    await api.delete(`/data/word_import_tasks/${id}`);
    return { data: { success: true } };
  },

  /** 获取统计信息 */
  async getStats() {
    // 分 4 个状态查询计数
    const statuses: ImportTaskStatus[] = ['querying', 'ready', 'imported', 'failed'];
    const counts: Record<string, number> = { querying: 0, ready: 0, imported: 0, failed: 0 };
    // 用一次查询 + 前端统计
    const res = await api.post('/query/word_import_tasks', {
      select: ['status'],
      pageSize: 1000,
    });
    const rows: any[] = res.data?.data || [];
    rows.forEach((r: any) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return { data: counts };
  },
};

/* ═══════════ 用户词典 API ═══════════ */

export const userDictionaryAPI = {
  /** 创建词典 */
  async create(id: string, name: string, description: string | undefined, isPublic: boolean = false) {
    // 获取当前用户 ID
    const token = localStorage.getItem('auth_token');
    let creatorId: number | null = null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        creatorId = payload.uid;
      } catch { /* ignore */ }
    }
    await api.post('/data/dictionaries', {
      id, name, description: description || null, creator_id: creatorId, is_public: isPublic ? 1 : 0,
    });
    return { data: { success: true, dict: { id, name, description, isPublic } } };
  },

  /** 获取用户可见的词典列表（系统 + 自己创建的 + 公开的） */
  async getAll() {
    const res = await api.get('/data/dictionaries');
    const allDicts: any[] = unwrap<any[]>(res) || [];
    // 获取当前用户 ID
    let uid: number | null = null;
    try {
      const token = localStorage.getItem('auth_token');
      if (token) uid = JSON.parse(atob(token.split('.')[1])).uid;
    } catch { /* ignore */ }
    // 过滤：系统词典(creator_id=null) + 自己的 + 公开的
    const visible = allDicts.filter((d: any) =>
      d.creator_id === null || d.creator_id === uid || d.is_public === 1
    );
    return { data: { dicts: visible } };
  },

  /** 获取用户自己创建的词典 */
  async getOwn() {
    let uid: number | null = null;
    try {
      const token = localStorage.getItem('auth_token');
      if (token) uid = JSON.parse(atob(token.split('.')[1])).uid;
    } catch { /* ignore */ }
    const res = await api.get('/data/dictionaries');
    const allDicts: any[] = unwrap<any[]>(res) || [];
    const own = allDicts.filter((d: any) => d.creator_id === uid);
    return { data: { dicts: own } };
  },

  /** 更新词典 */
  async update(id: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    const updateData: any = { id };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic ? 1 : 0;
    await api.put('/data/dictionaries', [updateData]);
    return { data: { success: true } };
  },

  /** 删除词典 */
  async delete(id: string) {
    await api.delete(`/data/dictionaries/${encodeURIComponent(id)}`);
    return { data: { success: true } };
  },

  /** 获取词典统计 */
  async getStats(id: string) {
    // 查单词数
    const wordsRes = await api.post('/query/words', {
      select: [{ field: 'id', func: 'count', alias: 'cnt' }],
      where: [['dictionary_id', id]],
    });
    const wordCount = (wordsRes.data?.data?.[0] as any)?.cnt || 0;

    // 查例句数
    const sentRes = await api.post('/query/sentences', {
      select: [{ field: 'id', func: 'count', alias: 'cnt' }],
      where: [['dictionary_id', id]],
    });
    const sentenceCount = (sentRes.data?.data?.[0] as any)?.cnt || 0;

    return { data: { stats: { wordCount, sentenceCount, lastUpdated: null } } };
  },
};

/* ═══════════ 内部：异步查询百炼 AI ═══════════ */

function _queryWordAsync(taskId: number, word: string) {
  queryWordFromBaiLian(word)
    .then(async (wordData) => {
      await api.put('/data/word_import_tasks', [{
        id: taskId,
        status: 'ready',
        word_data: wordData,
      }]);
    })
    .catch(async (err) => {
      try {
        await api.put('/data/word_import_tasks', [{
          id: taskId,
          status: 'failed',
          error_message: err.message || 'Unknown error',
        }]);
      } catch { /* ignore update failure */ }
    });
}
