// /backend/src/global.d.ts
import * as chaiHttp from 'chai-http';

declare global {
  export const chaiHttp: typeof import('chai-http');
}