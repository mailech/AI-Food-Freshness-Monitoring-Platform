// MongoDB initialization script for AI Food Freshness Monitoring Platform
db = db.getSiblingDB('food_freshness_db');

// 1. Create collections
db.createCollection('activity_logs');
db.createCollection('api_monitoring');
db.createCollection('model_performance');
db.createCollection('notifications');

// 2. Build indexes for performance
// Activity logs: index on user_id and timestamp
db.activity_logs.createIndex({ user_id: 1, timestamp: -1 });
db.activity_logs.createIndex({ action: 1 });

// API Monitoring: index on timestamp (expirable logs if needed) and endpoint
db.api_monitoring.createIndex({ timestamp: -1 });
db.api_monitoring.createIndex({ endpoint: 1, status_code: 1 });
db.api_monitoring.createIndex({ latency_ms: 1 });

// Model Performance: index on model_name and run date
db.model_performance.createIndex({ model_name: 1, trained_at: -1 });

// Notifications: index on user_id, channel, and read status
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 });
db.notifications.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic expiry notifications cleanup

print('MongoDB initialized successfully with collections and indexes.');
