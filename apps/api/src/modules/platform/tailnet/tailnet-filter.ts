import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Server } from 'node:http';
import { isTailnetAddress } from './tailnet-address';

// Runs in onApplicationBootstrap, before listen, so every connection passes the check.
// A refused peer is destroyed with no response and no log line.
@Injectable()
export class TailnetFilter implements OnApplicationBootstrap {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  onApplicationBootstrap(): void {
    const server: Server = this.adapterHost.httpAdapter.getHttpServer();
    server.on('connection', (socket) => {
      if (
        socket.remoteAddress !== undefined &&
        isTailnetAddress(socket.remoteAddress)
      ) {
        socket.destroy();
      }
    });
  }
}
