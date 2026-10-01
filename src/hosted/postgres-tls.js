// pg replaces connection.stream with the client TLSSocket after SSLRequest.
// Backend pg_stat_ssl describes the provider's other hop, not this transport.
export function hasVerifiedPostgresTls(client) {
  const stream = client.connection?.stream;
  try {
    return stream?.encrypted === true && stream.authorized === true &&
      ["TLSv1.2", "TLSv1.3"].includes(stream.getProtocol?.());
  } catch {
    return false;
  }
}
