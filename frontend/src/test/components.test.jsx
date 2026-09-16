import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Pagination,
  ScoreRing,
  StatusBadge,
} from '../components/ui';
import { ScoreExplanation } from '../components/domain';
import { ToastProvider, useToast } from '../context/ToastContext';

function wrap(ui) {
  return render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  );
}

describe('Button', () => {
  it('renders and fires onClick', async () => {
    const onClick = vi.fn();
    wrap(<Button onClick={onClick}>Analyse</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Analyse' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('blocks interaction and marks busy while loading', async () => {
    const onClick = vi.fn();
    wrap(
      <Button onClick={onClick} loading>
        Saving
      </Button>,
    );
    const button = screen.getByRole('button', { name: /Saving/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button).catch(() => {});
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('StatusBadge accessibility', () => {
  it('shows a text label, not colour alone', () => {
    wrap(<StatusBadge status="NEAR_SPOILAGE" />);
    expect(screen.getByText('Near Spoilage')).toBeInTheDocument();
  });

  it('handles an unknown status without crashing', () => {
    wrap(<StatusBadge status="MYSTERY" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('ScoreRing', () => {
  it('exposes the score to assistive technology', () => {
    wrap(<ScoreRing score={81} label="Good" />);
    expect(screen.getByRole('img', { name: /81 out of 100/ })).toBeInTheDocument();
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders a dash when no score exists', () => {
    wrap(<ScoreRing score={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders the message, code and retry action', async () => {
    const onRetry = vi.fn();
    wrap(
      <ErrorState
        error={{ message: 'The uploaded file is not a supported image.', code: 'INVALID_IMAGE' }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/not a supported image/)).toBeInTheDocument();
    expect(screen.getByText(/INVALID_IMAGE/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('lists field-level validation errors', () => {
    wrap(
      <ErrorState
        error={{
          message: 'One or more fields are invalid.',
          code: 'VALIDATION_ERROR',
          fields: [{ field: 'temperature_c', message: 'must be <= 80' }],
        }}
      />,
    );
    expect(screen.getByText('temperature_c')).toBeInTheDocument();
    expect(screen.getByText(/must be <= 80/)).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders a title, description and action', () => {
    wrap(
      <EmptyState
        title="Your inventory is empty"
        description="Add a food item to begin."
        action={<Button>Add item</Button>}
      />,
    );
    expect(screen.getByText('Your inventory is empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('confirms and cancels destructive actions', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    wrap(
      <ConfirmDialog
        open
        onConfirm={onConfirm}
        onClose={onClose}
        title="Discard this item?"
        description="It will be recorded as waste."
        confirmLabel="Discard"
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    wrap(<ConfirmDialog open={false} title="Nope" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('reports the visible range and navigates', async () => {
    const onPageChange = vi.fn();
    wrap(
      <Pagination page={2} totalPages={5} total={95} pageSize={20} onPageChange={onPageChange} />,
    );
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders nothing when there are no rows', () => {
    wrap(<Pagination page={1} totalPages={1} total={0} pageSize={20} />);
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});

describe('ScoreExplanation (explainable AI panel)', () => {
  const assessment = {
    freshness_score: 80.8,
    freshness_category: 'GOOD',
    confidence: 0.91,
    components: { visual: 82, storage: 74, shelf_life: 80, product_age: 90 },
    weights_used: { visual: 0.4, storage: 0.25, shelf_life: 0.2, product_age: 0.15 },
    model: { is_demo: true, label: 'Demo AI Analysis (baseline)' },
  };

  it('shows every weighted component with its weight and contribution', () => {
    wrap(<ScoreExplanation assessment={assessment} />);

    expect(screen.getByText('Visual Condition')).toBeInTheDocument();
    expect(screen.getByText('Storage Conditions')).toBeInTheDocument();
    expect(screen.getByText('Shelf-Life Prediction')).toBeInTheDocument();
    expect(screen.getByText('Product Age')).toBeInTheDocument();

    // The specification's weights must be visible to the user.
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15%').length).toBeGreaterThan(0);

    // 0.40*82 + 0.25*74 + 0.20*80 + 0.15*90 = 81
    expect(screen.getByText('81')).toBeInTheDocument();
  });

  it('labels demo output honestly and states the confidence', () => {
    wrap(<ScoreExplanation assessment={assessment} />);
    expect(screen.getByText(/Demo AI Analysis/)).toBeInTheDocument();
    expect(screen.getByText(/This is an AI estimate/)).toBeInTheDocument();
    expect(screen.getByText(/91%/)).toBeInTheDocument();
    expect(screen.getByText(/not a laboratory measurement/)).toBeInTheDocument();
  });
});

describe('ToastProvider', () => {
  it('announces messages in a live region', async () => {
    function Trigger() {
      const toast = useToast();
      return <Button onClick={() => toast.success('Analysis complete')}>Notify</Button>;
    }

    wrap(<Trigger />);
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    await waitFor(() => {
      expect(screen.getAllByText('Analysis complete').length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('surfaces ApiError objects with their code as the title', async () => {
    function Trigger() {
      const toast = useToast();
      return (
        <Button
          onClick={() =>
            toast.apiError({ message: 'The image is too large.', code: 'FILE_TOO_LARGE' })
          }
        >
          Fail
        </Button>
      );
    }

    wrap(<Trigger />);
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }));
    await waitFor(() => {
      expect(screen.getAllByText('The image is too large.').length).toBeGreaterThan(0);
    });
    // The message is rendered twice on purpose: once visibly and once in the
    // screen-reader live region.
    expect(screen.getAllByText(/FILE TOO LARGE/i).length).toBeGreaterThan(0);
  });
});
