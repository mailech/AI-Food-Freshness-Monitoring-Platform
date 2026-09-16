/** Product catalogue: list, create, edit, deactivate. */
import { useState } from 'react';
import { catalogueApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDebounced, useDocumentTitle, usePagination } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  SkeletonTable,
  Textarea,
} from '../components/ui';
import { categoryIcon, formatNumber, titleise } from '../utils/format';

const EMPTY = {
  name: '',
  category_slug: '',
  brand: '',
  sku: '',
  description: '',
  default_unit: 'kg',
  shelf_life_days: '',
  default_packaging: '',
  storage_instructions: '',
};

function ProductModal({ open, onClose, product, onSaved }) {
  const { categories, packagingOptions } = useMeta();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Seed the form when the modal opens.
  const [seededFor, setSeededFor] = useState(null);
  if (open && seededFor !== (product?.id ?? 'new')) {
    setSeededFor(product?.id ?? 'new');
    setForm(
      product
        ? {
            name: product.name || '',
            category_slug: product.category?.slug || '',
            brand: product.brand || '',
            sku: product.sku || '',
            description: product.description || '',
            default_unit: product.default_unit || 'kg',
            shelf_life_days: product.shelf_life_days ?? '',
            default_packaging: product.default_packaging || '',
            storage_instructions: product.storage_instructions || '',
          }
        : EMPTY,
    );
    setError(null);
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        sku: form.sku.trim() || undefined,
        description: form.description.trim() || undefined,
        default_unit: form.default_unit,
        shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : undefined,
        default_packaging: form.default_packaging || undefined,
        storage_instructions: form.storage_instructions.trim() || undefined,
      };
      if (product) {
        const category = categories.find((c) => c.slug === form.category_slug);
        await catalogueApi.updateProduct(product.id, {
          ...payload,
          category_id: category?.id,
        });
        toast.success('Product updated.');
      } else {
        await catalogueApi.createProduct({ ...payload, category_slug: form.category_slug });
        toast.success('Product created.');
      }
      setSeededFor(null);
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setSeededFor(null);
        onClose();
      }}
      title={product ? `Edit ${product.name}` : 'New product'}
      description="Products are templates; batches are the physical lots you track."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!form.name || !form.category_slug}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      {error && <ErrorState error={error} className="mb-4" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="p-name" required className="sm:col-span-2">
          <Input id="p-name" value={form.name} onChange={(event) => update('name', event.target.value)} />
        </Field>
        <Field label="Category" htmlFor="p-category" required>
          <Select
            id="p-category"
            value={form.category_slug}
            onChange={(event) => update('category_slug', event.target.value)}
          >
            <option value="">Select…</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand" htmlFor="p-brand">
          <Input id="p-brand" value={form.brand} onChange={(event) => update('brand', event.target.value)} />
        </Field>
        <Field label="SKU" htmlFor="p-sku">
          <Input id="p-sku" value={form.sku} onChange={(event) => update('sku', event.target.value)} />
        </Field>
        <Field label="Default unit" htmlFor="p-unit">
          <Select id="p-unit" value={form.default_unit} onChange={(event) => update('default_unit', event.target.value)}>
            {['kg', 'g', 'l', 'ml', 'pcs', 'pack', 'box'].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Shelf life (days)" htmlFor="p-shelf" hint="Overrides the category default">
          <Input
            id="p-shelf"
            type="number"
            min="1"
            value={form.shelf_life_days}
            onChange={(event) => update('shelf_life_days', event.target.value)}
          />
        </Field>
        <Field label="Default packaging" htmlFor="p-pack">
          <Select
            id="p-pack"
            value={form.default_packaging}
            onChange={(event) => update('default_packaging', event.target.value)}
          >
            <option value="">Not specified</option>
            {packagingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="p-desc" className="sm:col-span-2">
          <Textarea id="p-desc" value={form.description} onChange={(event) => update('description', event.target.value)} />
        </Field>
        <Field label="Storage instructions" htmlFor="p-storage" className="sm:col-span-2">
          <Textarea
            id="p-storage"
            rows={2}
            value={form.storage_instructions}
            onChange={(event) => update('storage_instructions', event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

export default function ProductsPage() {
  useDocumentTitle('Products');
  const { hasPermission } = useAuth();
  const { categories } = useMeta();
  const toast = useToast();
  const pagination = usePagination(20);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounced(search, 350);
  const canWrite = hasPermission('product:write');

  const { data, loading, error, refetch } = useAsync(
    () =>
      catalogueApi.products({
        q: debouncedSearch || undefined,
        category_slug: category || undefined,
        is_active: activeOnly ? true : undefined,
        page: pagination.page,
        page_size: pagination.pageSize,
        sort_by: 'name',
        sort_dir: 'asc',
      }),
    [debouncedSearch, category, activeOnly, pagination.page, pagination.pageSize],
  );

  const products = data?.items || [];
  const meta = data?.meta || {};

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const result = await catalogueApi.deleteProduct(pendingDelete.id);
      toast.success(result.message);
      setPendingDelete(null);
      refetch();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="The catalogue of products you track. Each batch references one product."
        actions={
          canWrite && (
            <Button
              size="sm"
              icon="＋"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              New product
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Search" htmlFor="search">
                <Input
                  id="search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    pagination.setPage(1);
                  }}
                  placeholder="Name, SKU or brand"
                />
              </Field>
              <Field label="Category" htmlFor="category">
                <Select
                  id="category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name} ({item.product_count})
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs text-content-secondary">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={(event) => setActiveOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
                  />
                  Active products only
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {loading && !data ? (
          <SkeletonTable rows={8} columns={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : products.length === 0 ? (
          <Card>
            <EmptyState
              icon="⬡"
              title="No products found"
              description="Create a product to start tracking batches of it."
              action={
                canWrite && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setModalOpen(true);
                    }}
                  >
                    New product
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader title={`${meta.total} product${meta.total === 1 ? '' : 's'}`} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>SKU</th>
                    <th>Unit</th>
                    <th>Shelf life</th>
                    <th>Batches</th>
                    {canWrite && <th />}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className={product.is_active ? undefined : 'opacity-55'}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden="true" className="text-lg">
                            {categoryIcon(product.category?.slug)}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-content-primary">{product.name}</span>
                            {product.brand && (
                              <span className="block truncate text-xs text-content-tertiary">{product.brand}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-content-secondary">{product.category?.name}</td>
                      <td className="font-mono text-xs text-content-tertiary">{product.sku || '—'}</td>
                      <td>{product.default_unit}</td>
                      <td className="tabular-nums">
                        {product.shelf_life_days ? `${product.shelf_life_days} d` : '—'}
                      </td>
                      <td className="tabular-nums">{formatNumber(product.batch_count)}</td>
                      {canWrite && (
                        <td>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(product);
                                setModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 dark:text-rose-400"
                              onClick={() => setPendingDelete(product)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={meta.total_pages}
              total={meta.total}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </Card>
        )}

        {/* -------------------------------------------- category reference */}
        <Card>
          <CardHeader
            title="Category reference"
            subtitle="Storage envelopes and baseline shelf life per category (configurable defaults, not authoritative limits)"
          />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Products</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>Baseline shelf life</th>
                  <th>Key indicators</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => (
                  <tr key={item.slug}>
                    <td>
                      <span aria-hidden="true" className="mr-2">
                        {categoryIcon(item.slug)}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </td>
                    <td className="tabular-nums">{item.product_count}</td>
                    <td className="tabular-nums">
                      {item.storage_rule.temp_min_c}–{item.storage_rule.temp_max_c} °C
                    </td>
                    <td className="tabular-nums">
                      {item.storage_rule.humidity_min_pct}–{item.storage_rule.humidity_max_pct}%
                    </td>
                    <td className="tabular-nums">{item.baseline_shelf_life_days} d</td>
                    <td className="text-xs text-content-secondary">
                      {(item.key_indicators || []).map(titleise).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ProductModal
        open={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Remove this product?"
        description={`${pendingDelete?.name} will be deleted if it has no batches, or deactivated if batches exist so their analysis history is preserved.`}
        confirmLabel="Remove product"
      />
    </>
  );
}
