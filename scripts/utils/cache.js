const fs = require('fs-extra');
const path = require('path');

class Cache {
  constructor(cacheFile) {
    this.cacheFile = cacheFile;
    this.data = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        this.data = fs.readJsonSync(this.cacheFile);
      }
    } catch (error) {
      console.error(`Failed to load cache from ${this.cacheFile}:`, error);
      this.data = {};
    }
  }

  save() {
    try {
      fs.ensureDirSync(path.dirname(this.cacheFile));
      fs.writeJsonSync(this.cacheFile, this.data, { spaces: 2 });
    } catch (error) {
      console.error(`Failed to save cache to ${this.cacheFile}:`, error);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  has(key) {
    return key in this.data;
  }

  clear() {
    this.data = {};
    this.save();
  }
}

module.exports = Cache;