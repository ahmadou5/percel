const fs = require('fs');

const userKyc = fs.readFileSync('./user/app/settings/kyc.tsx', 'utf8');

let driverKyc = userKyc.replace(/useProfile, useUpdateProfile, useVerifyBvn, useVerifyNin/g, 'useDriverProfile as useProfile, useVerifyDriverBvn as useVerifyBvn');
driverKyc = driverKyc.replace(/import { useProfile.*/, `import { useDriverProfile as useProfile, useVerifyDriverBvn as useVerifyBvn } from '@/hooks/useDriverProfile';`);

// Remove NIN logic
driverKyc = driverKyc.replace(/const verifyNin = useVerifyNin\(\);/, '');
driverKyc = driverKyc.replace(/const updateProfile = useUpdateProfile\(\);/, '');
driverKyc = driverKyc.replace(/!updateProfile.isPending &&/g, '');

// Since driver API might not have profile.kycComplete directly, driver profile uses profile.status === 'ACTIVE' or profile.kyc?.bvnVerified
driverKyc = driverKyc.replace(/const kycComplete = Boolean\([\s\S]*?\);/, `const kycComplete = Boolean(
    profile?.status === 'ACTIVE' || profile?.kyc?.bvnVerified || profile?.kycStatus === 'APPROVED'
  );`);

driverKyc = driverKyc.replace(/profile\?\.status === 'SUSPENDED'/g, `profile?.status === 'SUSPENDED' || profile?.kycStatus === 'REJECTED'`);

// Replace the submit function
driverKyc = driverKyc.replace(/const submit = async \(\) => {[\s\S]*?try {[\s\S]*?catch \(error\) {[\s\S]*?};/, `const submit = async () => {
    if (!canSubmit) {
      modal.alert('Complete required fields', 'Please fill in all details.', 'warning');
      return;
    }
    try {
      const result = await verifyBvn.mutateAsync({
        bvn: bvn.trim(),
        accountNumber: accountNumber.trim(),
        bankCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['banks'] }),
      ]);
      if (result.verified || result.kycComplete) {
        modal.alert('Verification Approved!', 'Your identity is verified.', 'success');
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      modal.alert('Verification Failed', error instanceof Error ? error.message : 'Please check your details and try again.', 'error');
    }
  };`);

driverKyc = driverKyc.replace(/import { useProfile.*} from '@\/hooks\/useProfile';/g, `import { useDriverProfile as useProfile, useVerifyDriverBvn as useVerifyBvn } from '@/hooks/useDriverProfile';`);

fs.writeFileSync('./driver/app/(kyc)/index.tsx', driverKyc, 'utf8');
