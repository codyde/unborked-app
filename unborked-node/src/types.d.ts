// Extend Express Request with user property
declare namespace Express {
  export interface Request {
    user?: {
      userId: number;
      username: string;
      [key: string]: any;
    };
  }
}