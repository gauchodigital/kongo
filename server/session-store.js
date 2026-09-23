import session from 'express-session';
import { getPool } from './db.js';

export class MySqlSessionStore extends session.Store {
  get(sid, callback) {
    getPool().query('SELECT data FROM user_sessions WHERE session_id = ? AND expires_at > NOW()', [sid])
      .then(([rows]) => {
        if (!rows[0]) return callback(null, null);
        const data = rows[0].data;
        callback(null, typeof data === 'string' ? JSON.parse(data) : data);
      })
      .catch(callback);
  }

  set(sid, value, callback = () => {}) {
    const expires = value.cookie?.expires ? new Date(value.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    getPool().execute(
      `INSERT INTO user_sessions (session_id, expires_at, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at), data=VALUES(data)`,
      [sid, expires, JSON.stringify(value)]
    ).then(() => callback()).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    getPool().execute('DELETE FROM user_sessions WHERE session_id = ?', [sid])
      .then(() => callback()).catch(callback);
  }

  touch(sid, value, callback = () => {}) {
    const expires = value.cookie?.expires ? new Date(value.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    getPool().execute('UPDATE user_sessions SET expires_at = ? WHERE session_id = ?', [expires, sid])
      .then(() => callback()).catch(callback);
  }
}
