import { VersionHistory } from '../types';

class VersionControl {
  private versionHistory: VersionHistory[] = [];
  private currentVersion = '0.1.0';
  
  constructor() {
    this.loadVersionHistory();
    
    // Add initial version if none exists
    if (this.versionHistory.length === 0) {
      this.addVersion(this.currentVersion, 'Initial version');
    }
  }
  
  private loadVersionHistory() {
    try {
      const savedHistory = localStorage.getItem('version_history');
      if (savedHistory) {
        this.versionHistory = JSON.parse(savedHistory);
        
        if (this.versionHistory.length > 0) {
          this.currentVersion = this.versionHistory[this.versionHistory.length - 1].version;
        }
      }
    } catch (e) {
      console.error('Failed to load version history', e);
    }
  }
  
  private saveVersionHistory() {
    try {
      localStorage.setItem('version_history', JSON.stringify(this.versionHistory));
    } catch (e) {
      console.error('Failed to save version history', e);
    }
  }
  
  getCurrentVersion(): string {
    return this.currentVersion;
  }
  
  getVersionHistory(): VersionHistory[] {
    return [...this.versionHistory];
  }
  
  addVersion(version: string, changes: string) {
    const newVersion: VersionHistory = {
      version,
      timestamp: new Date().toISOString(),
      changes
    };
    
    this.versionHistory.push(newVersion);
    this.currentVersion = version;
    this.saveVersionHistory();
    
    return newVersion;
  }
  
  incrementMajor(changes: string): string {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    const newVersion = `${major + 1}.0.0`;
    this.addVersion(newVersion, changes);
    return newVersion;
  }
  
  incrementMinor(changes: string): string {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    const newVersion = `${major}.${minor + 1}.0`;
    this.addVersion(newVersion, changes);
    return newVersion;
  }
  
  incrementPatch(changes: string): string {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;
    this.addVersion(newVersion, changes);
    return newVersion;
  }
  
  downloadVersionHistory() {
    try {
      const historyText = JSON.stringify(this.versionHistory, null, 2);
      const blob = new Blob([historyText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'version_history.json';
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download version history', e);
    }
  }
}

export const versionControl = new VersionControl();