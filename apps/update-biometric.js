const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const userFiles = walk('./user/app/(tabs)/wallet');
const driverFiles = walk('./driver/app/(tabs)/wallet');
const allFiles = [...userFiles, ...driverFiles];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Check if it uses PaymentPinModal
  if (!content.includes('<PaymentPinModal')) return;

  // Determine the handler function name
  let handlerName = 'openPaymentAuth';
  if (content.includes('const handleOpenPinModal =')) handlerName = 'handleOpenPinModal';
  if (content.includes('const handleInitiate =')) handlerName = 'handleInitiate';

  // Replace <PaymentPinModal
  // with <PaymentPinModal onBiometricPress={handlerName}
  if (!content.includes('onBiometricPress={')) {
    content = content.replace(/<PaymentPinModal/g, `<PaymentPinModal\n        onBiometricPress={${handlerName}}`);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file} with ${handlerName}`);
  }
});
