import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BeneficiaryType = 'PHONE' | 'BANK' | 'AIRTIME';

export type Beneficiary = {
  id: string;
  name: string;
  phone?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  serviceID?: string;
  type: BeneficiaryType;
  createdAt: number;
};

type BeneficiaryState = {
  beneficiaries: Beneficiary[];
  addBeneficiary: (beneficiary: Omit<Beneficiary, 'id' | 'createdAt'>) => void;
  removeBeneficiary: (id: string) => void;
};

export const useBeneficiaryStore = create<BeneficiaryState>()(
  persist(
    (set, get) => ({
      beneficiaries: [],
      addBeneficiary: (beneficiary) => {
        const id = Math.random().toString(36).substring(7);
        const newBeneficiary: Beneficiary = {
          ...beneficiary,
          id,
          createdAt: Date.now(),
        };

        // Prevent duplicate checks
        const exists = get().beneficiaries.some((b) => {
          if (b.type !== beneficiary.type) return false;
          if (beneficiary.type === 'BANK') {
            return b.accountNumber === beneficiary.accountNumber && b.bankCode === beneficiary.bankCode;
          }
          return b.phone === beneficiary.phone;
        });

        if (exists) return;

        set((state) => ({
          beneficiaries: [newBeneficiary, ...state.beneficiaries],
        }));
      },
      removeBeneficiary: (id) => {
        set((state) => ({
          beneficiaries: state.beneficiaries.filter((b) => b.id !== id),
        }));
      },
    }),
    {
      name: 'percel_beneficiaries_storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
