/**
 * Procedural Food Sample Generator
 * Generates realistic high-resolution canvas food textures for real-time Vision Transformer analysis
 * Includes clean fresh items as well as bruised and mold-infested items.
 */

class FoodSampleGenerator {
  constructor() {
    this.samples = [
      {
        id: 'sample_fresh_apple',
        name: 'Fresh Honeycrisp Apple',
        category: 'fruits',
        expectedCondition: 'Fresh',
        description: 'Glossy red cuticle, pristine skin, zero fungal blemishes.',
        draw: (ctx, w, h) => {
          // Vibrant red apple gradient
          const grad = ctx.createRadialGradient(w * 0.45, h * 0.4, 10, w * 0.5, h * 0.5, w * 0.45);
          grad.addColorStop(0, '#f87171');
          grad.addColorStop(0.5, '#dc2626');
          grad.addColorStop(0.85, '#991b1b');
          grad.addColorStop(1, '#7f1d1d');
          
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);

          // Apple body
          ctx.beginPath();
          ctx.arc(w * 0.42, h * 0.52, w * 0.35, 0, Math.PI * 2);
          ctx.arc(w * 0.58, h * 0.52, w * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Highlight gloss
          ctx.beginPath();
          ctx.ellipse(w * 0.35, h * 0.38, w * 0.12, w * 0.06, -0.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fill();

          // Green leaf
          ctx.beginPath();
          ctx.ellipse(w * 0.58, h * 0.18, w * 0.08, w * 0.03, 0.6, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();

          // Stem
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h * 0.25);
          ctx.quadraticCurveTo(w * 0.48, h * 0.15, w * 0.44, h * 0.12);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 6;
          ctx.stroke();
        }
      },
      {
        id: 'sample_bruised_banana',
        name: 'Ripening Cavendish Banana (Bruised)',
        category: 'fruits',
        expectedCondition: 'Acceptable',
        description: 'Yellow skin with dark necrotic bruising spots and senescent marks.',
        draw: (ctx, w, h) => {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);

          // Banana curved crescent
          ctx.beginPath();
          ctx.moveTo(w * 0.2, h * 0.75);
          ctx.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.82, h * 0.35);
          ctx.quadraticCurveTo(w * 0.5, h * 0.65, w * 0.2, h * 0.75);
          ctx.fillStyle = '#facc15';
          ctx.fill();
          ctx.lineWidth = 14;
          ctx.strokeStyle = '#eab308';
          ctx.stroke();

          // Bruise clusters (necrotic dark brown patches)
          const bruises = [
            { x: w * 0.42, y: h * 0.72, r: 18 },
            { x: w * 0.46, y: h * 0.68, r: 12 },
            { x: w * 0.55, y: h * 0.62, r: 24 },
            { x: w * 0.62, y: h * 0.52, r: 15 },
            { x: w * 0.35, y: h * 0.76, r: 9 }
          ];

          bruises.forEach(b => {
            const bGrad = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
            bGrad.addColorStop(0, '#451a03');
            bGrad.addColorStop(0.7, '#78350f');
            bGrad.addColorStop(1, 'rgba(120, 53, 15, 0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = bGrad;
            ctx.fill();
          });
        }
      },
      {
        id: 'sample_moldy_bread',
        name: 'Spoiled Artisan Bread (Fungal Bloom)',
        category: 'bakery',
        expectedCondition: 'Spoiled',
        description: 'Wheat loaf infested with greenish-gray Rhizopus mold colonies.',
        draw: (ctx, w, h) => {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);

          // Bread slice crust
          ctx.beginPath();
          ctx.roundRect(w * 0.22, h * 0.25, w * 0.56, h * 0.52, [40, 40, 16, 16]);
          ctx.fillStyle = '#d97706';
          ctx.fill();

          // Inner crumb
          ctx.beginPath();
          ctx.roundRect(w * 0.26, h * 0.29, w * 0.48, h * 0.44, [32, 32, 12, 12]);
          ctx.fillStyle = '#fef3c7';
          ctx.fill();

          // Heavy mold spore colony (grayish green fungal patches)
          const moldPatches = [
            { x: w * 0.45, y: h * 0.42, r: 35 },
            { x: w * 0.58, y: h * 0.52, r: 28 },
            { x: w * 0.38, y: h * 0.55, r: 22 }
          ];

          moldPatches.forEach(m => {
            const mGrad = ctx.createRadialGradient(m.x, m.y, 4, m.x, m.y, m.r);
            mGrad.addColorStop(0, '#14532d');
            mGrad.addColorStop(0.5, '#166534');
            mGrad.addColorStop(0.8, '#cbd5e1');
            mGrad.addColorStop(1, 'rgba(203, 213, 225, 0)');

            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fillStyle = mGrad;
            ctx.fill();

            // Powdery speckles
            for (let i = 0; i < 40; i++) {
              const ox = (Math.random() - 0.5) * m.r * 1.6;
              const oy = (Math.random() - 0.5) * m.r * 1.6;
              ctx.fillStyle = Math.random() > 0.4 ? '#f8fafc' : '#15803d';
              ctx.beginPath();
              ctx.arc(m.x + ox, m.y + oy, Math.random() * 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      },
      {
        id: 'sample_fresh_salmon',
        name: 'Pristine Atlantic Salmon Fillet',
        category: 'seafood',
        expectedCondition: 'Fresh',
        description: 'Vibrant coral orange muscle striations, clear lipid marbling, firm structure.',
        draw: (ctx, w, h) => {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);

          // Salmon fillet shape
          ctx.beginPath();
          ctx.moveTo(w * 0.2, h * 0.35);
          ctx.lineTo(w * 0.75, h * 0.28);
          ctx.quadraticCurveTo(w * 0.85, h * 0.65, w * 0.72, h * 0.75);
          ctx.lineTo(w * 0.25, h * 0.72);
          ctx.closePath();

          const grad = ctx.createLinearGradient(w * 0.2, h * 0.3, w * 0.8, h * 0.7);
          grad.addColorStop(0, '#fb923c');
          grad.addColorStop(0.5, '#f97316');
          grad.addColorStop(1, '#ea580c');
          ctx.fillStyle = grad;
          ctx.fill();

          // White connective fascia lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 3;
          for (let y = h * 0.32; y < h * 0.72; y += 14) {
            ctx.beginPath();
            ctx.moveTo(w * 0.28, y);
            ctx.quadraticCurveTo(w * 0.5, y + 6, w * 0.72, y - 4);
            ctx.stroke();
          }
        }
      },
      {
        id: 'sample_rotten_veg',
        name: 'Rotten Vegetable (Fungal Soft Rot & Mold)',
        category: 'vegetables',
        expectedCondition: 'Spoiled',
        description: 'Decaying cucumber/zucchini with soft brown tissue collapse, bacterial lesions, and greenish fungal mycelium.',
        draw: (ctx, w, h) => {
          ctx.fillStyle = '#0b0f19';
          ctx.fillRect(0, 0, w, h);

          // Decaying cucumber body - discolored yellowing dark olive body
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.52, w * 0.16, w * 0.38, -0.2, 0, Math.PI * 2);
          const vegGrad = ctx.createLinearGradient(w * 0.3, h * 0.2, w * 0.7, h * 0.8);
          vegGrad.addColorStop(0, '#3f3f1c'); // sickly olive yellow
          vegGrad.addColorStop(0.3, '#1c2810'); // decaying dark green
          vegGrad.addColorStop(0.7, '#2c1e0f'); // rotting brown soft tissue
          vegGrad.addColorStop(1, '#181208'); // dark necrosis
          ctx.fillStyle = vegGrad;
          ctx.fill();

          // Soft rot sunken lesions (brown necrotic patches)
          const lesions = [
            { x: w * 0.46, y: h * 0.38, rx: 18, ry: 24, rot: 0.2 },
            { x: w * 0.54, y: h * 0.58, rx: 22, ry: 32, rot: -0.3 },
            { x: w * 0.44, y: h * 0.72, rx: 16, ry: 20, rot: 0.1 }
          ];

          lesions.forEach(l => {
            ctx.beginPath();
            ctx.ellipse(l.x, l.y, l.rx, l.ry, l.rot, 0, Math.PI * 2);
            const lGrad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.ry);
            lGrad.addColorStop(0, '#120a04');
            lGrad.addColorStop(0.6, '#38200a');
            lGrad.addColorStop(1, 'rgba(56, 32, 10, 0)');
            ctx.fillStyle = lGrad;
            ctx.fill();
          });

          // Mold colonies & fungal spores (whitish-green fuzzy mold bloom)
          const moldClusters = [
            { x: w * 0.48, y: h * 0.40, r: 20 },
            { x: w * 0.56, y: h * 0.60, r: 24 }
          ];

          moldClusters.forEach(m => {
            const mGrad = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, m.r);
            mGrad.addColorStop(0, '#15803d');
            mGrad.addColorStop(0.5, '#4ade80');
            mGrad.addColorStop(0.8, '#e2e8f0');
            mGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fillStyle = mGrad;
            ctx.fill();

            // Mold fuzz particles
            for (let i = 0; i < 35; i++) {
              const ox = (Math.random() - 0.5) * m.r * 1.8;
              const oy = (Math.random() - 0.5) * m.r * 1.8;
              ctx.fillStyle = Math.random() > 0.3 ? '#f8fafc' : '#86efac';
              ctx.beginPath();
              ctx.arc(m.x + ox, m.y + oy, Math.random() * 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }
    ];
  }

  getSamples() {
    return this.samples;
  }

  generateDataUrl(sampleId, size = 320) {
    const sample = this.samples.find(s => s.id === sampleId) || this.samples[0];
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    sample.draw(ctx, size, size);
    return canvas.toDataURL('image/png');
  }

  drawToCanvas(sampleId, canvas) {
    const sample = this.samples.find(s => s.id === sampleId) || this.samples[0];
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sample.draw(ctx, canvas.width, canvas.height);
  }
}

window.foodSampleGenerator = new FoodSampleGenerator();
