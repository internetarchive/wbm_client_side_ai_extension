export class WordDiffEngine {
  #tokenA = [];
  #tokenB = [];
  #dp = null;

  #tokenize(text) {
    return text.match(/\S+\s*/g) || [];
  }

  #computeLCS(i, j) {
    if(i === 0 || j === 0) return 0;
    if(this.#dp[i][j] !== -1) return this.#dp[i][j];

    if(this.#tokenA[i-1] === this.#tokenB[j-1]) {
      return this.#dp[i][j] = 1 + this.#computeLCS(i - 1, j - 1);
    }
    return this.#dp[i][j] = Math.max(
      this.#computeLCS(i - 1, j),
      this.#computeLCS(i, j - 1)
    )
  }

  #backtrack(n, m) {
    const result = [];
    let i = n, j = m;
    while(i > 0 && j > 0) {
      if(this.#tokenA[i-1] === this.#tokenB[j-1]) {
        result.unshift({ type: "unchanged", value: this.#tokenA[i-1] });
        i--; j--;
      }
      else if(this.#dp[i-1][j] >= this.#dp[i][j-1]) {
        result.unshift({ type: "removed", value: this.#tokenA[i-1] });
        i--;
      }
      else {
        result.unshift({ type: "added", value: this.#tokenB[j-1] });
        j--;
      }
    }
    while (i > 0) { result.unshift({ type: "removed", value: this.#tokenA[i - 1] }); i--; }
    while (j > 0) { result.unshift({ type: "added", value: this.#tokenB[j - 1] }); j--; }
    return result;
  }

  #buildChunks(diffItems) {
    const chunks = [];
    let current = null;
    for (const item of diffItems) {
      if (!current || current.type !== item.type) {
        current = { type: item.type, value: item.value };
        chunks.push(current);
      } else {
        current.value += item.value;
      }
    }
    return chunks;
  }

  diff(textA, textB) {
    this.#tokenA = this.#tokenize(textA);
    this.#tokenB = this.#tokenize(textB);

    let n = this.#tokenA.length;
    let m = this.#tokenB.length;

    this.#dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1).fill(-1));

    this.#computeLCS(n, m);

    const diffItems = this.#backtrack(n, m);

    return this.#buildChunks(diffItems);
  }
};
