/** Canonical system-design interview prompts. */
export const DESIGN_PROMPTS: { title: string; prompt: string }[] = [
  { title: "Design a URL Shortener", prompt: "Design a URL shortener like bit.ly. Focus on the short-code scheme, redirect path latency, analytics, and scaling reads." },
  { title: "Design Twitter / X feed", prompt: "Design the home timeline for Twitter. Focus on fan-out on write vs read, the celebrity problem, and feed ranking hooks." },
  { title: "Design WhatsApp", prompt: "Design a 1:1 and group chat system. Focus on message delivery/ordering, online presence, offline delivery, and end-to-end encryption implications." },
  { title: "Design a Rate Limiter", prompt: "Design a distributed rate limiter as a service. Focus on the algorithm, the shared counter store, and correctness at window boundaries." },
  { title: "Design a News Feed (Instagram-style)", prompt: "Design a photo-sharing news feed. Focus on the feed generation strategy, media storage/CDN, and pagination." },
  { title: "Design Uber (matching)", prompt: "Design the rider-driver matching system. Focus on geospatial indexing, real-time location updates, and dispatch." },
  { title: "Design a Notification System", prompt: "Design a system that sends push / email / SMS notifications at scale. Focus on fan-out, provider failover, dedupe, and user preferences." },
  { title: "Design Dropbox / file sync", prompt: "Design file storage and sync across devices. Focus on chunking, dedupe, conflict resolution, and metadata vs blob storage." },
  { title: "Design a Web Crawler", prompt: "Design a large-scale web crawler. Focus on the URL frontier, politeness, dedupe, and freshness." },
  { title: "Design Ticketmaster", prompt: "Design a system for selling event tickets. Focus on inventory reservation, preventing double-booking, and handling flash-sale spikes." },
  { title: "Design a Distributed Cache", prompt: "Design a Redis-like distributed cache. Focus on partitioning, replication, eviction, and consistency during resharding." },
  { title: "Design a Key-Value Store", prompt: "Design a distributed KV store. Focus on partitioning (consistent hashing), replication, the consistency model, and read/write quorums." },
];
