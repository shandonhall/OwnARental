import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'own-a-rental-api',
      phase: 3,
    };
  }
}
