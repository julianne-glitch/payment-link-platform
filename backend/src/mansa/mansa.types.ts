export interface MansaAuthResponse {
  accessToken: string;
  expiresIn: number;
}

export interface MansaInitiateResponse {
  transactionReference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}
