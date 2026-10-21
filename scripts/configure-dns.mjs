import dns from "node:dns";
const configured = process.env.MONGODB_DNS_SERVERS?.split(",").map((item) => item.trim()).filter(Boolean);
if (configured?.length) dns.setServers(configured);
else if (dns.getServers().length > 0 && dns.getServers().every((server) => server === "127.0.0.1" || server === "::1"))
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
