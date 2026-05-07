import {
  CodeforcesClient,
  resolveCodeforcesCredentials,
} from '../../../../integrations/codeforces/codeforces-api.service.js';
import type {
  CodeforcesCredentials,
  CodeforcesGateway,
  CodeforcesGatewayFactory,
} from '../../application/ports/CodeforcesGateway.js';

class DefaultCodeforcesGateway implements CodeforcesGateway {
  constructor(private readonly codeforcesClient: CodeforcesClient) {}

  fetchGymMetadata(gymId: string) {
    return this.codeforcesClient.fetchGymMetadata(gymId);
  }
}

export class DefaultCodeforcesGatewayFactory implements CodeforcesGatewayFactory {
  create(credentials: CodeforcesCredentials): CodeforcesGateway {
    return new DefaultCodeforcesGateway(
      new CodeforcesClient(
        credentials
          ? resolveCodeforcesCredentials(credentials.apiKey, credentials.apiSecret)
          : null,
      ),
    );
  }
}
