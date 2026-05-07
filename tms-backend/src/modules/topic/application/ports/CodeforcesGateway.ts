export type CodeforcesCredentials = {
  apiKey: string;
  apiSecret: string;
} | null;

export interface CodeforcesGateway {
  fetchGymMetadata(gymId: string): Promise<{ gym_id: string; title: string }>;
}

export interface CodeforcesGatewayFactory {
  create(credentials: CodeforcesCredentials): CodeforcesGateway;
}
