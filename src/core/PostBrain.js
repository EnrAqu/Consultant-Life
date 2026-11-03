// A LinkedIn post (docs/PM_LINKEDIN.md §3): step on it and the likes start (one every `likeMs`, whether you stay or not).
// At `likes` it goes viral and collapses; after `respawnMs` the feed refreshes and it is back (never a soft-lock).
// Pivoted (the lesson learned): it never collapses, the likes just keep coming. Pure logic.
export const MAX_SHOWN_LIKES = 999;

export default class PostBrain {
  constructor({ likes = 3, likeMs = 350, respawnMs = 2500, pivoted = false }) {
    this.maxLikes = likes;
    this.likeMs = likeMs;
    this.respawnMs = respawnMs;
    this.pivoted = pivoted;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.likes = 0;
    this.timer = 0;
  }

  get solid() {
    return this.state !== 'gone';
  }

  touch() {
    if (this.state !== 'idle') return;
    this.state = 'liking';
    this.timer = 0;
  }

  // Returns 'like' | 'collapse' | 'restore' | null (one event per call).
  update(dt) {
    if (this.state === 'liking') {
      this.timer += dt;
      if (this.timer < this.likeMs) return null;
      this.timer -= this.likeMs;
      this.likes = Math.min(MAX_SHOWN_LIKES, this.likes + 1);
      if (!this.pivoted && this.likes >= this.maxLikes) {
        this.state = 'gone';
        this.timer = 0;
        return 'collapse';
      }
      return 'like';
    }
    if (this.state === 'gone') {
      this.timer += dt;
      if (this.timer >= this.respawnMs) {
        this.reset();
        return 'restore';
      }
    }
    return null;
  }
}
