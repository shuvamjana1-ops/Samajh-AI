import type express from 'express';
import { createApp } from '../server.ts';

let appPromise: Promise<express.Express> | undefined;

export default async function handler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  await new Promise<void>((resolve) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    app(req, res);
  });
}
