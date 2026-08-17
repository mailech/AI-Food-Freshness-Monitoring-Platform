# FreshLens - Viva Preparation Guide

This guide contains concise, technically accurate answers to the top questions asked during academic demonstrations and vivas.

---

### 1. What problem does FreshLens solve?
FreshLens addresses the global food waste and supply chain inefficiency problem. Up to 30% of perishable food is wasted in warehousing and retail due to inaccurate decay forecasting and visual decay inspection. FreshLens automates freshness scoring, tracks storage compliance, and guides dispatch orders to prioritize item lifespans.

### 2. Why is AI needed?
Traditional freshness estimation is manually inspected (slow and subjective) or simply rule-based based on purchase dates (ignoring actual environmental storage parameters). AI computer vision segments images, identifies decay markers, and classifies overall visual quality objectively and instantly from camera feeds.

### 3. What model is used?
We use `FoodFreshnessCNN`, a 5-layer Convolutional Neural Network (CNN) containing feature extraction modules (2D convolutions, batch normalization, max-pooling) and a linear projection classification header. The architecture is decoupled to allow seamless swapping with deeper networks (such as ResNet or YOLO) without modifying application layers.

### 4. What are the model classes?
The classifier maps visual input to 5 standard classes:
1. `FRESH` (normal fresh state)
2. `SPOILED` (advanced decay state)
3. `MOLD` (surface mold contamination)
4. `BRUISED/DAMAGED` (surface physical defects)
5. `UNKNOWN` (fallback class for low-confidence inference)

### 5. How does image preprocessing work?
Uploaded images are loaded via Pillow, validated for integrity/dimensions (min 32x32px), resized to target dimension `224x224x3`, normalized to standard ImageNet means and standard deviations, transposed to channel-first shape `(1, 3, 224, 224)`, and packaged as float tensors.

### 6. How is freshness calculated?
The system utilizes a weighted, multi-dimensional freshness scoring calculation ($100\%$ scale):
$$\text{Freshness Score} = (0.40 \times \text{Visual Score}) + (0.25 \times \text{Storage Score}) + (0.20 \times \text{Shelf-Life Score}) + (0.15 \times \text{Age Score})$$
The weights are configurable via settings and validated to sum to exactly `1.0`.

### 7. How is shelf life estimated?
Shelf-life is computed using a rule-based **Arrhenius kinetics estimator** mapping temperature and humidity inputs alongside category sensitivity coefficients:
$$\text{Shelf Life} = \text{Base Shelf Life} \times \text{Packaging Modifier} \times e^{-\text{activation energy} \cdot (T - T_{\text{ideal}})}$$
This is labeled explicitly in the schemas as a heuristic kinetics estimator, avoiding faking ML results.

### 8. Why PostgreSQL?
We use PostgreSQL (SQLAlchemy ORM) to manage highly relational, structured transactional data: users, batches (lots), and inventory logs that require strict relational integrity, unique constraints, and foreign key boundaries.

### 9. Why MongoDB?
We use MongoDB (Beanie ODM) to store high-frequency, loosely structured time-series events: sensor storage logs, visual scan reports, and real-time system alerts. MongoDB allows rapid document queries and horizontal scaling.

### 10. Why FastAPI?
FastAPI provides high-performance execution speeds matching Node.js/Go (built on Starlette and Uvicorn), utilizes Pydantic validation to secure data boundaries early, and automatically generates OpenAPI Interactive Swagger Docs.

### 11. Why Next.js?
Next.js offers a robust React-based environment (App Router) for visual dashboards, provides API rewrites to proxy requests dynamically without CORS issues, and handles layouts natively.

### 12. How does authentication work?
Passwords are encrypted using cryptographically salted bcrypt hashes. Login generates an HMAC-SHA256 JWT access token (60-minute expiration). Subsequent client requests forward the token in the `Authorization: Bearer <token>` header.

### 13. How does RBAC work?
Role-Based Access Control is enforced on FastAPI routers via dependencies. Endpoints check if the authenticated user's role (CONSUMER, RETAIL_MANAGER, WAREHOUSE_OPERATOR, etc.) is allowed before running operations.

### 14. How does FEFO work?
**First Expired, First Out (FEFO)** prioritizes dispatch based on decay: it queries active batches, calculates remaining shelf life, sorts them ascending by expiry date, and recommends the earliest expiring batch first.

### 15. What happens when model confidence is low?
If model classification confidence is below the threshold (`MODEL_CONFIDENCE_THRESHOLD = 0.60`), the postprocessor overrides the prediction to `UNKNOWN` and warns: *"Uncertain — manual inspection recommended"*, preventing false negatives.

### 16. How is mold handled?
If mold is confidently identified (`MOLD`), a safety override forces the visual freshness score directly to `0.0`. The item status updates to `SPOILED` immediately, bypassing age/storage metrics to prevent consumption.

### 17. How is security handled?
- **Global Error Handler**: Starlette exception handlers catch and log raw stack traces server-side, hiding database and filesystem internals from clients.
- **Image Validation**: Size (max 5MB), extension, MIME-type, and corrupt pixel checks filter uploads.
- **CORS limits**: Restricts access to configurable domains.

### 18. What are the limitations?
- Model accuracy relies on the size of the training dataset.
- Arrhenius kinetics shelf-life predictions are mathematical approximations; biological shelf life varies.

### 19. What would you improve in the next version?
- Integrate IoT Bluetooth temperature/humidity trackers.
- Implement object detection bounding-box segmentations (YOLOv8) to draw highlights on detected bruises.
