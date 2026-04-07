import { createClient, type RedisClientType } from "redis";

const DAY_SECONDS = 60 * 60 * 24;

export class CacheService {
  private client: RedisClientType | null = null;
  private connected = false;

  async connect(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    this.client = createClient({ url: redisUrl });
    this.client.on("error", (error) => {
      this.connected = false;
      console.error("Redis error:", error);
    });

    await this.client.connect();
    this.connected = true;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) return null;
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async setJSON(key: string, value: unknown, ttlSeconds = DAY_SECONDS): Promise<void> {
    if (!this.client || !this.connected) return;
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async close(): Promise<void> {
    if (!this.client || !this.connected) return;
    await this.client.quit();
    this.connected = false;
  }
}
