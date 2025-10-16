const crypto = require("crypto");

function generateRequestHash() {
  const siteCode = process.env.OZOW_SITE_CODE;
  const countryCode = "ZA";
  const currencyCode = "ZAR";
  const amount = 1;
  const transactionReference = "123";
  const bankReference = "ABC123";
  const cancelUrl = "http://mydomain.com/cancel.html";
  const errorUrl = "http://mydomain.com/error.html";
  const successUrl = "http://mydomain.com/success.html";
  const notifyUrl = "http://mydomain/notify.html";
  const privateKey = "process.env.OZOW_PRIVATE_KEY";
  const isTest = false;

  const inputString = `${siteCode}${countryCode}${currencyCode}${amount}${transactionReference}${bankReference}${cancelUrl}${errorUrl}${successUrl}${notifyUrl}${isTest}${privateKey}`;

  const calculatedHashResult = generateRequestHashCheck(inputString);
  console.log(`Hashcheck: ${calculatedHashResult}`);
}

function generateRequestHashCheck(inputString) {
  const stringToHash = inputString.toLowerCase();
  console.log(`Before Hashcheck: ${stringToHash}`);
  return getSha512Hash(stringToHash);
}

function getSha512Hash(stringToHash) {
  const hash = crypto.createHash("sha512");
  hash.update(stringToHash);
  return hash.digest("hex");
}

generateRequestHash();


const data = {
	countryCode: "ZA",
	amount: "1",
	transactionReference: "Test1",
	bankReference: "Test1",
	cancelUrl: "http://test.i-pay.co.za/responsetest.php",
	currencyCode: "ZAR",
	errorUrl: "http://test.i-pay.co.za/responsetest.php",
	isTest: false,
	notifyUrl: "http://test.i-pay.co.za/responsetest.php",
	siteCode: "[YOUR SITECODE]",
	successUrl: "http://test.i-pay.co.za/responsetest.php",
	hashCheck: "[GENERATED HASH]"
};

const options = {
	method: 'POST',
	headers: {
	'Accept': 'application/json',
	'ApiKey': '[API KEY HERE]',
	'Content-Type': 'application/json',
	},
	body: JSON.stringify(data)
};

fetch('https://api.ozow.com/postpaymentrequest', options)
  .then(response => response.text())
  .then(data => console.log(data))
.catch(error => console.error(error));
