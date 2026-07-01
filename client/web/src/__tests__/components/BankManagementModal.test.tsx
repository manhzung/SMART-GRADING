import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BankManagementModal from '../../presentation/components/BankManagementModal';

// Mock bankService
vi.mock('../../services/bankService', () => ({
  bankService: {
    listMembers: vi.fn(),
    listPendingRequests: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    respondToRequest: vi.fn(),
  },
}));

// Mock useBankStore - must use correct path from __tests__/components/
vi.mock('../../presentation/store/bankStore', () => ({
  useBankStore: () => ({
    currentMembership: { role: 'manager' },
  }),
}));

import { bankService } from '../../services/bankService';

describe('BankManagementModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    (bankService.listMembers as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    (bankService.listPendingRequests as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/loading members/i)).toBeInTheDocument();
  });

  it('displays members in correct sections', async () => {
    // Note: Pending members with role='viewer' will appear in BOTH Viewers and Pending sections
    // because the component filters by role AND status separately
    (bankService.listMembers as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          _id: 'm1',
          bankId: 'bank-123',
          userId: { _id: 'u1', name: 'John Owner', email: 'john@test.com' },
          role: 'owner',
          status: 'active',
        },
        {
          _id: 'm2',
          bankId: 'bank-123',
          userId: { _id: 'u2', name: 'Jane Manager', email: 'jane@test.com' },
          role: 'manager',
          status: 'active',
        },
        {
          _id: 'm3',
          bankId: 'bank-123',
          userId: { _id: 'u3', name: 'Bob Viewer', email: 'bob@test.com' },
          role: 'viewer',
          status: 'active',
        },
      ],
    });
    (bankService.listPendingRequests as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          _id: 'm4',
          bankId: 'bank-123',
          userId: { _id: 'u4', name: 'Alice Pending', email: 'alice@test.com' },
          role: 'viewer',
          status: 'pending',
        },
      ],
    });

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Managers')).toBeInTheDocument();
      expect(screen.getByText('Viewers')).toBeInTheDocument();
      expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    });

    // Managers section: John Owner + Jane Manager (2 total)
    expect(screen.getByText('John Owner')).toBeInTheDocument();
    expect(screen.getByText('Jane Manager')).toBeInTheDocument();

    // Viewers section: Bob Viewer (active) + Alice Pending (pending with viewer role)
    expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
    // Note: Alice appears in BOTH Viewers and Pending sections
    const aliceElements = screen.getAllByText('Alice Pending');
    expect(aliceElements.length).toBe(2); // Once in Viewers, once in Pending
  });

  it('promotes viewer to manager', async () => {
    (bankService.listMembers as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          _id: 'm3',
          bankId: 'bank-123',
          userId: { _id: 'u3', name: 'Bob Viewer', email: 'bob@test.com' },
          role: 'viewer',
          status: 'active',
        },
      ],
    });
    (bankService.listPendingRequests as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [] });
    (bankService.updateMemberRole as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
    });

    const promoteBtn = screen.getByRole('button', { name: /promote/i });
    fireEvent.click(promoteBtn);

    await waitFor(() => {
      expect(bankService.updateMemberRole).toHaveBeenCalledWith('bank-123', 'u3', 'manager');
    });
  });

  it('approves pending request', async () => {
    (bankService.listMembers as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [] });
    (bankService.listPendingRequests as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          _id: 'm4',
          bankId: 'bank-123',
          userId: { _id: 'u4', name: 'Alice Pending', email: 'alice@test.com' },
          role: 'viewer',
          status: 'pending',
        },
      ],
    });
    (bankService.respondToRequest as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={vi.fn()}
      />
    );

    // Wait for and find the Approve button in the Pending section
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(bankService.respondToRequest).toHaveBeenCalledWith('bank-123', 'u4', 'approve');
    });
  });

  it('removes member with confirmation', async () => {
    (bankService.listMembers as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [
        {
          _id: 'm3',
          bankId: 'bank-123',
          userId: { _id: 'u3', name: 'Bob Viewer', email: 'bob@test.com' },
          role: 'viewer',
          status: 'active',
        },
      ],
    });
    (bankService.listPendingRequests as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [] });
    (bankService.removeMember as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(
      <BankManagementModal
        bankId="bank-123"
        open={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Viewer')).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    // Click confirm button in dialog - get the second "Remove" button (in ConfirmDialog)
    const confirmBtns = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(confirmBtns[1]); // Second button is in the ConfirmDialog

    await waitFor(() => {
      expect(bankService.removeMember).toHaveBeenCalledWith('bank-123', 'u3');
    });
  });
});
