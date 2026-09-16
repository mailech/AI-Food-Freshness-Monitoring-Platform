/** Create a batch (and optionally its product) — the "add food item" flow. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { batchApi, catalogueApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDebounced, useDocumentTitle } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { categoryIcon, formatDate } from '../utils/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function BatchFormPage() {
  useDocumentTitle('Add a food item');
  const navigate = useNavigate();
  const toast = useToast();
  const { categories, packagingOptions, airCirculationOptions, lightExposureOptions, categoryBySlug } =
    useMeta();

  const [mode, setMode] = useState('existing'); // existing | new
  const [productQuery, setProductQuery] = useState('');
  const debouncedQuery = useDebounced(productQuery, 350);

  const [form, setForm] = useState({
    product_id: '',
    // new-product fields
    new_name: '',
    new_category: '',
    new_brand: '',
    new_unit: 'kg',
    new_shelf_life: '',
    // batch fields
    quantity: '1',
    unit: '',
    batch_number: '',
    purchase_date: todayIso(),
    storage_date: todayIso(),
    production_date: '',
    expected_expiry_date: '',
    packaging_type: '',
    storage_location: '',
    supplier: '',
    cost_per_unit: '',
    temperature_c: '',
    humidity_pct: '',
    air_circulation: '',
    light_exposure: '',
    notes: '',
    add_to_my_inventory: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: products, loading: productsLoading } = useAsync(
    () => catalogueApi.products({ q: debouncedQuery || undefined, page_size: 20 }),
    [debouncedQuery],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  const selectedProduct = (products?.items || []).find(
    (product) => String(product.id) === String(form.product_id),
  );
  const activeCategorySlug =
    mode === 'new' ? form.new_category : selectedProduct?.category?.slug;
  const profile = activeCategorySlug ? categoryBySlug[activeCategorySlug] : null;

  function validate() {
    const errors = {};
    if (mode === 'existing' && !form.product_id) errors.product_id = 'Choose a product.';
    if (mode === 'new') {
      if (form.new_name.trim().length < 2) errors.new_name = 'Enter a product name.';
      if (!form.new_category) errors.new_category = 'Choose a category.';
    }
    if (!form.quantity || Number(form.quantity) < 0) errors.quantity = 'Enter a quantity.';
    if (
      form.production_date &&
      form.expected_expiry_date &&
      form.production_date > form.expected_expiry_date
    ) {
      errors.expected_expiry_date = 'Expiry cannot be before the production date.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      let productId = Number(form.product_id);

      if (mode === 'new') {
        const created = await catalogueApi.createProduct({
          name: form.new_name.trim(),
          category_slug: form.new_category,
          brand: form.new_brand.trim() || undefined,
          default_unit: form.new_unit || 'kg',
          shelf_life_days: form.new_shelf_life ? Number(form.new_shelf_life) : undefined,
        });
        productId = created.id;
        toast.success(`Product "${created.name}" created.`);
      }

      const batch = await batchApi.create({
        product_id: productId,
        quantity: Number(form.quantity),
        unit: form.unit || undefined,
        batch_number: form.batch_number.trim() || undefined,
        production_date: form.production_date || undefined,
        purchase_date: form.purchase_date || undefined,
        storage_date: form.storage_date || undefined,
        expected_expiry_date: form.expected_expiry_date || undefined,
        packaging_type: form.packaging_type || undefined,
        storage_location: form.storage_location.trim() || undefined,
        supplier: form.supplier.trim() || undefined,
        cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : undefined,
        temperature_c: form.temperature_c === '' ? undefined : Number(form.temperature_c),
        humidity_pct: form.humidity_pct === '' ? undefined : Number(form.humidity_pct),
        air_circulation: form.air_circulation || undefined,
        light_exposure: form.light_exposure || undefined,
        notes: form.notes.trim() || undefined,
        add_to_my_inventory: form.add_to_my_inventory,
      });

      toast.success(`Batch ${batch.batch_number} created.`);
      navigate(`/analyze?batch=${batch.id}`);
    } catch (err) {
      setError(err);
      if (err.fields) {
        setFieldErrors(Object.fromEntries(err.fields.map((f) => [f.field.split('.').pop(), f.message])));
      }
      toast.apiError(err, 'The batch could not be created.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/batches" className="hover:underline">
            ← All batches
          </Link>
        }
        title="Add a food item"
        description="Create a batch to track. You will be taken straight to the analysis workflow afterwards."
      />

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3" noValidate>
        <div className="space-y-4 lg:col-span-2">
          {/* -------------------------------------------------- product */}
          <Card>
            <CardHeader
              title="Product"
              subtitle="Pick an existing product or define a new one"
              actions={
                <div className="flex overflow-hidden rounded-xl border border-edge">
                  {[
                    { value: 'existing', label: 'Existing' },
                    { value: 'new', label: 'New product' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      aria-pressed={mode === option.value}
                      className={
                        mode === option.value
                          ? 'bg-[rgb(var(--accent))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--accent-contrast))]'
                          : 'bg-surface-raised px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-sunken'
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody className="space-y-4">
              {mode === 'existing' ? (
                <>
                  <Field label="Search products" htmlFor="product-search">
                    <Input
                      id="product-search"
                      type="search"
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                      placeholder="Mango, milk, chicken…"
                    />
                  </Field>
                  <Field label="Product" htmlFor="product" required error={fieldErrors.product_id}>
                    {productsLoading ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-content-tertiary">
                        <Spinner size="sm" /> Loading products…
                      </div>
                    ) : (
                      <Select
                        id="product"
                        value={form.product_id}
                        onChange={(event) => update('product_id', event.target.value)}
                        invalid={Boolean(fieldErrors.product_id)}
                      >
                        <option value="">Select a product…</option>
                        {(products?.items || []).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                            {product.brand ? ` — ${product.brand}` : ''} ({product.category?.name})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  {selectedProduct && (
                    <div className="flex items-center gap-3 rounded-xl bg-[rgb(var(--accent)/0.07)] p-3 text-sm">
                      <span aria-hidden="true" className="text-xl">
                        {categoryIcon(selectedProduct.category?.slug)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-content-primary">{selectedProduct.name}</p>
                        <p className="text-xs text-content-secondary">
                          {selectedProduct.category?.name} · default unit {selectedProduct.default_unit}
                          {selectedProduct.shelf_life_days
                            ? ` · typical shelf life ${selectedProduct.shelf_life_days} days`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Product name" htmlFor="new-name" required error={fieldErrors.new_name}>
                    <Input
                      id="new-name"
                      value={form.new_name}
                      onChange={(event) => update('new_name', event.target.value)}
                      placeholder="Alphonso Mango"
                      invalid={Boolean(fieldErrors.new_name)}
                    />
                  </Field>
                  <Field label="Category" htmlFor="new-category" required error={fieldErrors.new_category}>
                    <Select
                      id="new-category"
                      value={form.new_category}
                      onChange={(event) => update('new_category', event.target.value)}
                      invalid={Boolean(fieldErrors.new_category)}
                    >
                      <option value="">Select a category…</option>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Brand" htmlFor="new-brand">
                    <Input
                      id="new-brand"
                      value={form.new_brand}
                      onChange={(event) => update('new_brand', event.target.value)}
                    />
                  </Field>
                  <Field label="Default unit" htmlFor="new-unit">
                    <Select
                      id="new-unit"
                      value={form.new_unit}
                      onChange={(event) => update('new_unit', event.target.value)}
                    >
                      {['kg', 'g', 'l', 'ml', 'pcs', 'pack', 'box'].map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Typical shelf life (days)"
                    htmlFor="new-shelf-life"
                    hint="Leave blank to use the category default"
                  >
                    <Input
                      id="new-shelf-life"
                      type="number"
                      min="1"
                      value={form.new_shelf_life}
                      onChange={(event) => update('new_shelf_life', event.target.value)}
                      placeholder={profile ? String(profile.baseline_shelf_life_days) : '7'}
                    />
                  </Field>
                </div>
              )}
            </CardBody>
          </Card>

          {/* ---------------------------------------------------- batch */}
          <Card>
            <CardHeader title="Batch details" subtitle="Quantity, dates and packaging" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Quantity" htmlFor="quantity" required error={fieldErrors.quantity}>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.quantity}
                    onChange={(event) => update('quantity', event.target.value)}
                    invalid={Boolean(fieldErrors.quantity)}
                  />
                </Field>
                <Field label="Unit" htmlFor="unit" hint="Defaults to the product unit">
                  <Select id="unit" value={form.unit} onChange={(event) => update('unit', event.target.value)}>
                    <option value="">Use product default</option>
                    {['kg', 'g', 'l', 'ml', 'pcs', 'pack', 'box'].map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Batch number" htmlFor="batch-number" hint="Auto-generated if left blank">
                  <Input
                    id="batch-number"
                    value={form.batch_number}
                    onChange={(event) => update('batch_number', event.target.value)}
                    placeholder="BTCH-20260915-0001"
                  />
                </Field>
                <Field label="Purchase date" htmlFor="purchase-date">
                  <Input
                    id="purchase-date"
                    type="date"
                    value={form.purchase_date}
                    onChange={(event) => update('purchase_date', event.target.value)}
                  />
                </Field>
                <Field label="Storage date" htmlFor="storage-date">
                  <Input
                    id="storage-date"
                    type="date"
                    value={form.storage_date}
                    onChange={(event) => update('storage_date', event.target.value)}
                  />
                </Field>
                <Field label="Production date" htmlFor="production-date" hint="Optional">
                  <Input
                    id="production-date"
                    type="date"
                    value={form.production_date}
                    onChange={(event) => update('production_date', event.target.value)}
                  />
                </Field>
                <Field
                  label="Best-before / expiry"
                  htmlFor="expiry"
                  hint="Blank derives it from the shelf life"
                  error={fieldErrors.expected_expiry_date}
                >
                  <Input
                    id="expiry"
                    type="date"
                    value={form.expected_expiry_date}
                    onChange={(event) => update('expected_expiry_date', event.target.value)}
                    invalid={Boolean(fieldErrors.expected_expiry_date)}
                  />
                </Field>
                <Field label="Packaging" htmlFor="packaging">
                  <Select
                    id="packaging"
                    value={form.packaging_type}
                    onChange={(event) => update('packaging_type', event.target.value)}
                  >
                    <option value="">Not specified</option>
                    {packagingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Storage location" htmlFor="location">
                  <Input
                    id="location"
                    value={form.storage_location}
                    onChange={(event) => update('storage_location', event.target.value)}
                    placeholder="Cold Room A / Fridge top shelf"
                  />
                </Field>
                <Field label="Supplier" htmlFor="supplier">
                  <Input
                    id="supplier"
                    value={form.supplier}
                    onChange={(event) => update('supplier', event.target.value)}
                  />
                </Field>
                <Field label="Cost per unit" htmlFor="cost" hint="Used for value-at-risk analytics">
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_per_unit}
                    onChange={(event) => update('cost_per_unit', event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Notes" htmlFor="notes" className="mt-4">
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(event) => update('notes', event.target.value)}
                  placeholder="Delivered warm; moved to the chiller immediately."
                />
              </Field>
            </CardBody>
          </Card>

          {/* ------------------------------------------ initial storage */}
          <Card>
            <CardHeader
              title="Initial storage conditions"
              subtitle="Optional, but they make the first freshness score much more accurate"
            />
            <CardBody className="space-y-4">
              {profile && (
                <InlineNotice tone="info" title={`Recommended for ${profile.name}`}>
                  {profile.storage_rule.temp_min_c}–{profile.storage_rule.temp_max_c} °C and{' '}
                  {profile.storage_rule.humidity_min_pct}–{profile.storage_rule.humidity_max_pct}% RH.{' '}
                  {profile.storage_rule.notes}
                </InlineNotice>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Temperature (°C)" htmlFor="temp">
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    value={form.temperature_c}
                    onChange={(event) => update('temperature_c', event.target.value)}
                    placeholder={profile ? String(profile.storage_rule.temp_min_c) : '4'}
                  />
                </Field>
                <Field label="Humidity (%)" htmlFor="hum">
                  <Input
                    id="hum"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.humidity_pct}
                    onChange={(event) => update('humidity_pct', event.target.value)}
                    placeholder={profile ? String(profile.storage_rule.humidity_min_pct) : '85'}
                  />
                </Field>
                <Field label="Air circulation" htmlFor="air">
                  <Select
                    id="air"
                    value={form.air_circulation}
                    onChange={(event) => update('air_circulation', event.target.value)}
                  >
                    <option value="">Not specified</option>
                    {airCirculationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Light exposure" htmlFor="light">
                  <Select
                    id="light"
                    value={form.light_exposure}
                    onChange={(event) => update('light_exposure', event.target.value)}
                  >
                    <option value="">Not specified</option>
                    {lightExposureOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </CardBody>
          </Card>

          {error && !error.fields && <ErrorState error={error} title="Could not create the batch" />}
        </div>

        {/* --------------------------------------------------- summary */}
        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader title="Ready to add" />
            <CardBody className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-content-tertiary">Product</dt>
                  <dd className="text-right font-medium text-content-primary">
                    {mode === 'new' ? form.new_name || '—' : selectedProduct?.name || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-content-tertiary">Quantity</dt>
                  <dd className="text-right font-medium text-content-primary">
                    {form.quantity} {form.unit || selectedProduct?.default_unit || ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-content-tertiary">Expiry</dt>
                  <dd className="text-right font-medium text-content-primary">
                    {form.expected_expiry_date ? formatDate(form.expected_expiry_date) : 'Auto'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-content-tertiary">Location</dt>
                  <dd className="text-right font-medium text-content-primary">{form.storage_location || '—'}</dd>
                </div>
              </dl>

              <label className="flex items-start gap-2 text-sm text-content-secondary">
                <input
                  type="checkbox"
                  checked={form.add_to_my_inventory}
                  onChange={(event) => update('add_to_my_inventory', event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
                />
                Add to my inventory
              </label>

              <Button type="submit" fullWidth size="lg" loading={saving}>
                Create batch & analyse
              </Button>
              <Link to="/batches" className="block text-center text-xs text-content-tertiary hover:underline">
                Cancel
              </Link>
            </CardBody>
          </Card>
        </div>
      </form>
    </>
  );
}
