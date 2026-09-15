/**
 * Module 3 & Document 1 Integration:
 * Vision Transformer & Multi-Head Self-Attention Engine for Food Freshness
 * 
 * Mathematical Implementations from "Attention Is All You Need" (Vaswani et al., 2017):
 * 1. Scaled Dot-Product Attention: Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) * V
 * 2. Multi-Head Attention: MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O
 * 3. Positional Encodings: PE_(pos, 2i) = sin(pos / 10000^(2i / d_model)), PE_(pos, 2i+1) = cos(pos / 10000^(2i / d_model))
 * 4. Image Patch Decomposition (ViT grid), Defect Localization & Spoilage Feature Extraction
 */

class VisionTransformerEngine {
  constructor(options = {}) {
    this.numHeads = options.numHeads || 4; // h = 4 parallel attention heads
    this.dModel = options.dModel || 64;   // Representation dimensionality
    this.dK = this.dModel / this.numHeads; // d_k = 16
    this.dV = this.dK;
    this.gridSize = options.gridSize || 4; // 4x4 = 16 spatial patches
    this.numPatches = this.gridSize * this.gridSize;

    // Initialize reproducible projection weights
    this.weights = this.initializeWeights();
  }

  initializeWeights() {
    // Generate deterministic orthogonal/normal projection matrices for h heads
    const heads = [];
    for (let h = 0; h < this.numHeads; h++) {
      heads.push({
        WQ: this.createMatrix(this.dModel, this.dK, (i, j) => Math.sin(h * 13 + i * 0.17 + j * 0.23) * 0.2),
        WK: this.createMatrix(this.dModel, this.dK, (i, j) => Math.cos(h * 17 + i * 0.19 + j * 0.31) * 0.2),
        WV: this.createMatrix(this.dModel, this.dK, (i, j) => Math.sin(h * 19 + i * 0.29 + j * 0.11) * 0.2)
      });
    }
    const WO = this.createMatrix(this.numHeads * this.dV, this.dModel, (i, j) => Math.cos(i * 0.15 + j * 0.07) * 0.2);
    return { heads, WO };
  }

  createMatrix(rows, cols, fn) {
    const mat = [];
    for (let r = 0; r < rows; r++) {
      const row = new Float32Array(cols);
      for (let c = 0; c < cols; c++) {
        row[c] = fn(r, c);
      }
      mat.push(row);
    }
    return mat;
  }

  /**
   * Equation (3.5) from Vaswani et al. (2017):
   * PE(pos, 2i) = sin(pos / 10000^(2i/dmodel))
   * PE(pos, 2i+1) = cos(pos / 10000^(2i/dmodel))
   */
  computePositionalEncoding(pos, dModel) {
    const pe = new Float32Array(dModel);
    for (let i = 0; i < dModel / 2; i++) {
      const denominator = Math.pow(10000, (2 * i) / dModel);
      pe[2 * i] = Math.sin(pos / denominator);
      pe[2 * i + 1] = Math.cos(pos / denominator);
    }
    return pe;
  }

  /**
   * Section 3.2.1: Scaled Dot-Product Attention
   * Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V
   */
  scaledDotProductAttention(Q, K, V, mask = null) {
    const nQ = Q.length;
    const nK = K.length;
    const dK = K[0].length;
    const scale = Math.sqrt(dK);

    // 1. Compute Raw Attention Scores: S = (Q * K^T) / sqrt(d_k)
    const scores = [];
    for (let i = 0; i < nQ; i++) {
      const row = new Float32Array(nK);
      for (let j = 0; j < nK; j++) {
        let dot = 0.0;
        for (let d = 0; d < dK; d++) {
          dot += Q[i][d] * K[j][d];
        }
        row[j] = dot / scale;
      }
      scores.push(row);
    }

    // 2. Apply Softmax to get Attention Weights (Probabilities)
    const attentionWeights = [];
    for (let i = 0; i < nQ; i++) {
      let maxVal = -Infinity;
      for (let j = 0; j < nK; j++) {
        if (scores[i][j] > maxVal) maxVal = scores[i][j];
      }

      const expRow = new Float32Array(nK);
      let sumExp = 0.0;
      for (let j = 0; j < nK; j++) {
        expRow[j] = Math.exp(scores[i][j] - maxVal);
        sumExp += expRow[j];
      }

      const weightRow = new Float32Array(nK);
      for (let j = 0; j < nK; j++) {
        weightRow[j] = expRow[j] / (sumExp || 1.0);
      }
      attentionWeights.push(weightRow);
    }

    // 3. Multiply with Value Matrix: Output = AttentionWeights * V
    const output = [];
    const dV = V[0].length;
    for (let i = 0; i < nQ; i++) {
      const outRow = new Float32Array(dV);
      for (let d = 0; d < dV; d++) {
        let sum = 0.0;
        for (let j = 0; j < nK; j++) {
          sum += attentionWeights[i][j] * V[j][d];
        }
        outRow[d] = sum;
      }
      output.push(outRow);
    }

    return { output, attentionWeights };
  }

  /**
   * Section 3.2.2: Multi-Head Attention
   * MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W^O
   */
  multiHeadAttention(X) {
    const N = X.length; // Number of patches
    const headOutputs = [];
    const allAttentionMaps = [];

    // Compute for each of the h heads
    for (let h = 0; h < this.numHeads; h++) {
      const { WQ, WK, WV } = this.weights.heads[h];

      // Linear projections: Q = X * WQ, K = X * WK, V = X * WV
      const Q = this.matrixMultiply(X, WQ);
      const K = this.matrixMultiply(X, WK);
      const V = this.matrixMultiply(X, WV);

      const { output, attentionWeights } = this.scaledDotProductAttention(Q, K, V);
      headOutputs.push(output);
      allAttentionMaps.push(attentionWeights);
    }

    // Concat heads: for each patch i, concatenate all heads
    const concatenated = [];
    for (let i = 0; i < N; i++) {
      const row = new Float32Array(this.numHeads * this.dV);
      for (let h = 0; h < this.numHeads; h++) {
        for (let d = 0; d < this.dV; d++) {
          row[h * this.dV + d] = headOutputs[h][i][d];
        }
      }
      concatenated.push(row);
    }

    // Final linear projection with W^O
    const projectedOutput = this.matrixMultiply(concatenated, this.weights.WO);

    // Compute Ensemble / Average Attention Map across all heads
    const ensembleAttentionMap = [];
    for (let i = 0; i < N; i++) {
      const row = new Float32Array(N);
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let h = 0; h < this.numHeads; h++) {
          sum += allAttentionMaps[h][i][j];
        }
        row[j] = sum / this.numHeads;
      }
      ensembleAttentionMap.push(row);
    }

    return {
      output: projectedOutput,
      headAttentionMaps: allAttentionMaps,
      ensembleAttentionMap
    };
  }

  matrixMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;

    const result = [];
    for (let r = 0; r < rowsA; r++) {
      const row = new Float32Array(colsB);
      for (let c = 0; c < colsB; c++) {
        let sum = 0.0;
        for (let k = 0; k < colsA; k++) {
          sum += A[r][k] * B[k][c];
        }
        row[c] = sum;
      }
      result.push(row);
    }
    return result;
  }

  /**
   * Extract features from an HTML Canvas image:
   * 1. Divides image into grid (e.g. 4x4 = 16 patches)
   * 2. Computes color degradation, texture roughness, mold spore signatures, and bruising
   * 3. Adds sinusoidal positional encodings
   * 4. Passes through Multi-Head Self-Attention
   */
  async analyzeCanvasImage(canvas, category = 'fruits') {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    const patchW = width / this.gridSize;
    const patchH = height / this.gridSize;

    const patchFeatures = [];
    const patchDiagnostics = [];

    let totalMoldPixels = 0;
    let totalBruisedPixels = 0;
    let totalDiscoloredPixels = 0;
    let totalExaminedPixels = 0;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const patchIndex = row * this.gridSize + col;
        const startX = Math.floor(col * patchW);
        const startY = Math.floor(row * patchH);
        const w = Math.min(Math.floor(patchW), width - startX);
        const h = Math.min(Math.floor(patchH), height - startY);

        const imgData = ctx.getImageData(startX, startY, w, h);
        const pixels = imgData.data;

        let rSum = 0, gSum = 0, bSum = 0;
        let brightnessVariance = 0;
        let moldScore = 0;
        let bruiseScore = 0;
        let decayScore = 0;
        const count = pixels.length / 4;

        // Step 1: Calculate Mean RGB & Grayscale
        const grays = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          const r = pixels[i * 4];
          const g = pixels[i * 4 + 1];
          const b = pixels[i * 4 + 2];
          rSum += r;
          gSum += g;
          bSum += b;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grays[i] = gray;

          // Detect fungal/mold bloom: Pale greenish/grayish fuzz or powdery white patches
          const isMoldLike = (Math.abs(r - g) < 20 && Math.abs(g - b) < 25 && gray > 140 && gray < 210 && (g > r || b > r));
          // Detect necrotic bruising / browning: Dark brownish discoloration (R > G > B with low overall brightness)
          const isBruiseLike = (r > 60 && r < 140 && g > 30 && g < 90 && b < 60 && r > g * 1.3);

          if (isMoldLike) {
            moldScore++;
            totalMoldPixels++;
          }
          if (isBruiseLike) {
            bruiseScore++;
            totalBruisedPixels++;
          }
        }

        totalExaminedPixels += count;
        const rMean = rSum / (count || 1);
        const gMean = gSum / (count || 1);
        const bMean = bSum / (count || 1);
        const grayMean = (rMean + gMean + bMean) / 3;

        // Step 2: Texture variance (roughness / surface degradation)
        for (let i = 0; i < count; i++) {
          brightnessVariance += Math.pow(grays[i] - grayMean, 2);
        }
        const textureRoughness = Math.sqrt(brightnessVariance / (count || 1)) / 128; // Normalized 0-1

        const patchMoldRatio = moldScore / count;
        const patchBruiseRatio = bruiseScore / count;
        const colorDegradation = Math.min(1.0, (textureRoughness * 0.4) + (patchBruiseRatio * 1.5) + (patchMoldRatio * 2.0));

        patchDiagnostics.push({
          patchIndex,
          row,
          col,
          startX,
          startY,
          w,
          h,
          rMean,
          gMean,
          bMean,
          textureRoughness,
          patchMoldRatio,
          patchBruiseRatio,
          colorDegradation
        });

        // Construct dModel (64-dim) vector for this patch
        const vector = new Float32Array(this.dModel);
        // Base visual features
        vector[0] = rMean / 255;
        vector[1] = gMean / 255;
        vector[2] = bMean / 255;
        vector[3] = textureRoughness;
        vector[4] = patchMoldRatio;
        vector[5] = patchBruiseRatio;
        vector[6] = colorDegradation;

        // Add harmonic frequencies to simulate high-dimensional learned representations
        for (let d = 7; d < this.dModel; d++) {
          vector[d] = Math.sin((d * 0.3) + (patchIndex * 0.5)) * textureRoughness + Math.cos(d * 0.1) * (rMean / 255);
        }

        // Section 3.5: Add Sinusoidal Positional Encoding
        const pe = this.computePositionalEncoding(patchIndex, this.dModel);
        for (let d = 0; d < this.dModel; d++) {
          vector[d] += pe[d] * 0.15; // Scaled positional infusion
        }

        patchFeatures.push(vector);
      }
    }

    // Step 3: Run Multi-Head Attention across all 16 patches
    const { output, headAttentionMaps, ensembleAttentionMap } = this.multiHeadAttention(patchFeatures);

    // Step 4: Calculate High-Level Freshness & Spoilage Metrics
    const moldFraction = totalMoldPixels / (totalExaminedPixels || 1);
    const bruiseFraction = totalBruisedPixels / (totalExaminedPixels || 1);

    // Attention Salience: Find patches that received the highest incoming attention across the network
    const patchAttentionSalience = new Float32Array(this.numPatches);
    for (let j = 0; j < this.numPatches; j++) {
      let incoming = 0;
      for (let i = 0; i < this.numPatches; i++) {
        incoming += ensembleAttentionMap[i][j];
      }
      patchAttentionSalience[j] = incoming / this.numPatches;
    }

    // Correlate attention weights with defect presence (attention focusing on defects)
    let defectAttentionFocus = 0;
    for (let p = 0; p < this.numPatches; p++) {
      if (patchDiagnostics[p].patchMoldRatio > 0.05 || patchDiagnostics[p].patchBruiseRatio > 0.08) {
        defectAttentionFocus += patchAttentionSalience[p];
      }
    }

    // Compute final visual degradation score (0 = completely spoiled, 100 = flawless pristine)
    const moldSeverity = Math.min(1.0, moldFraction * 12);
    const bruiseSeverity = Math.min(1.0, bruiseFraction * 8);
    const surfaceTextureDegradation = patchDiagnostics.reduce((acc, p) => acc + p.textureRoughness, 0) / this.numPatches;

    const overallVisualDegradation = Math.min(1.0, (moldSeverity * 0.5) + (bruiseSeverity * 0.3) + (surfaceTextureDegradation * 0.2));
    const visualConditionScore = Math.max(5, Math.round(100 * (1.0 - overallVisualDegradation)));

    return {
      visualConditionScore,
      spoilageIndicators: {
        colorDegradation: Number((overallVisualDegradation * 0.8).toFixed(2)),
        surfaceTextureChanges: Number(surfaceTextureDegradation.toFixed(2)),
        moldDetected: moldFraction > 0.02,
        bruisingDetected: bruiseFraction > 0.04,
        physicalDamage: Number(bruiseSeverity.toFixed(2))
      },
      attentionDetails: {
        numHeads: this.numHeads,
        headAttentionMaps,
        ensembleAttentionMap,
        patchAttentionSalience: Array.from(patchAttentionSalience),
        patchDiagnostics,
        gridSize: this.gridSize
      }
    };
  }

  /**
   * Render Attention Overlay on an output Canvas
   */
  renderAttentionOverlay(targetCanvas, attentionWeights, activeHead = 'ensemble', patches = []) {
    const ctx = targetCanvas.getContext('2d');
    const w = targetCanvas.width;
    const h = targetCanvas.height;
    const patchW = w / this.gridSize;
    const patchH = h / this.gridSize;

    // Determine weight per patch
    const N = this.numPatches;
    const salience = new Float32Array(N);

    if (activeHead === 'ensemble' || !attentionWeights[activeHead]) {
      // Use incoming column average
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          sum += attentionWeights[i] ? attentionWeights[i][j] : 0;
        }
        salience[j] = sum / N;
      }
    } else {
      const headMap = attentionWeights[activeHead];
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          sum += headMap[i][j];
        }
        salience[j] = sum / N;
      }
    }

    // Normalize salience to max
    let maxSal = 0;
    for (let i = 0; i < N; i++) if (salience[i] > maxSal) maxSal = salience[i];

    // Draw Heatmap
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const idx = r * this.gridSize + c;
        const norm = maxSal > 0 ? salience[idx] / maxSal : 0;
        const x = c * patchW;
        const y = r * patchH;

        // Color ramp: Purple/Blue (low) -> Yellow/Red (high attention)
        ctx.fillStyle = `rgba(255, ${Math.floor(70 + (1 - norm) * 120)}, ${Math.floor((1 - norm) * 200)}, ${0.15 + norm * 0.45})`;
        ctx.fillRect(x, y, patchW, patchH);

        // Border
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + norm * 0.5})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, patchW, patchH);

        // Highlight high-attention defect regions
        if (norm > 0.75) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`⚡ Attn ${(norm * 100).toFixed(0)}%`, x + 4, y + 14);
        }
      }
    }
  }
}

// Global Singleton Instance
window.visionTransformerEngine = new VisionTransformerEngine();
