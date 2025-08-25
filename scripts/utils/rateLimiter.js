class RateLimiter {
  constructor(minInterval = 1000) {
    this.minInterval = minInterval;
    this.lastCall = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      const delay = this.minInterval - timeSinceLastCall;
      await this.sleep(delay);
    }
    
    this.lastCall = Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RateLimiter;