// Cache exchange rates to avoid multiple API calls
let exchangeRates = {};
let lastInputCurrency = null;

// Function to fetch exchange rates
async function fetchExchangeRates(inputCurrency, showLoading = false) {
    if (exchangeRates[inputCurrency] && lastInputCurrency === inputCurrency) {
        return { rates: exchangeRates[inputCurrency], fromCache: true };
    }

    if (showLoading) {
        resultDiv.classList.add('loading-state', 'show');
        resultDiv.innerHTML = '<div class="loading"></div><span>Fetching exchange rates...</span>';
    }

    try {
        const response = await fetch('https://open.er-api.com/v6/latest/' + inputCurrency);
        const data = await response.json();
        if (data.result !== 'success') {
            throw new Error('API error');
        }
        exchangeRates[inputCurrency] = data.rates;
        lastInputCurrency = inputCurrency;
        return { rates: data.rates, fromCache: false };
    } catch (error) {
        throw new Error('Error fetching exchange rates. Please check your internet connection and try again.');
    }
}

// Get DOM elements
const currencyTypeSelect = document.getElementById('currency-type');
const amountInput = document.getElementById('amount');
const amountLabel = document.getElementById('amount-label');
const tcMarketPriceInput = document.getElementById('tc-market-price');
const tcMarketPriceGroup = document.getElementById('tc-market-price-group');
const tc250PriceInput = document.getElementById('tc-250-price');
const currencySelect = document.getElementById('currency');
const resultDiv = document.getElementById('result');
const resetButton = document.getElementById('reset-button');

// Update amount label based on currency type
function updateAmountLabel() {
    const currencyType = currencyTypeSelect.value;
    if (currencyType === 'gp') {
        amountLabel.textContent = 'GP Amount in kk:';
        amountInput.placeholder = 'e.g., 20';
        amountInput.step = '0.01';
    } else {
        amountLabel.textContent = 'Tibia Coin Amount:';
        amountInput.placeholder = 'e.g., 5000';
        amountInput.step = '1';
    }
}

// Main calculation function
async function calculate() {
    const currencyType = currencyTypeSelect.value;
    const amount = parseFloat(amountInput.value);
    const tcMarketPrice = parseFloat(tcMarketPriceInput.value);
    const tc250Price = parseFloat(tc250PriceInput.value);
    const currency = currencySelect.value;

    // Clear results if no amount is entered
    if (!amount || amount <= 0) {
        resultDiv.innerHTML = '';
        return;
    }

    let results = [];

    if (currencyType === 'gp') {
        // Starting with GP
        const gpAmount = amount * 1000000;

        // Calculate TC equivalent if market price is provided
        if (tcMarketPrice && tcMarketPrice > 0) {
            const tcAmount = gpAmount / tcMarketPrice;
            results.push(`<strong>${gpAmount.toLocaleString()} GP (${amount} kk)</strong> = <strong>${tcAmount.toFixed(2)} TC</strong>`);

            // Calculate fiat currencies if 250 TC price is provided
            if (tc250Price && tc250Price > 0) {
                const costInInputCurrency = (tcAmount / 250) * tc250Price;
                try {
                    const { rates } = await fetchExchangeRates(currency, true);
                    const costPLN = currency === 'PLN' ? costInInputCurrency : costInInputCurrency * rates.PLN;
                    const costEUR = currency === 'EUR' ? costInInputCurrency : costInInputCurrency * rates.EUR;
                    const costUSD = currency === 'USD' ? costInInputCurrency : costInInputCurrency * rates.USD;
                    const costGBP = currency === 'GBP' ? costInInputCurrency : costInInputCurrency * rates.GBP;
                    const costBRL = currency === 'BRL' ? costInInputCurrency : costInInputCurrency * rates.BRL;
                    const costSEK = currency === 'SEK' ? costInInputCurrency : costInInputCurrency * rates.SEK;

                    results.push(`<br><strong>Real Currency Value:</strong> ${costPLN.toFixed(2)} PLN | ${costEUR.toFixed(2)} EUR | ${costUSD.toFixed(2)} USD | ${costGBP.toFixed(2)} GBP | ${costBRL.toFixed(2)} BRL | ${costSEK.toFixed(2)} SEK`);
                } catch (error) {
                    results.push(`<br><span style="color: #e74c3c;">${error.message}</span>`);
                }
            }
        }
    } else {
        // Starting with TC
        const tcAmount = amount;

        // Calculate GP equivalent if market price is provided
        if (tcMarketPrice && tcMarketPrice > 0) {
            const gpAmount = tcAmount * tcMarketPrice;
            const gpAmountKK = gpAmount / 1000000;
            results.push(`<strong>${tcAmount.toLocaleString()} TC</strong> = <strong>${gpAmount.toLocaleString()} GP (${gpAmountKK.toFixed(2)} kk)</strong>`);
        }

        // Calculate fiat currencies if 250 TC price is provided
        if (tc250Price && tc250Price > 0) {
            const costInInputCurrency = (tcAmount / 250) * tc250Price;
            try {
                const { rates } = await fetchExchangeRates(currency, true);
                const costPLN = currency === 'PLN' ? costInInputCurrency : costInInputCurrency * rates.PLN;
                const costEUR = currency === 'EUR' ? costInInputCurrency : costInInputCurrency * rates.EUR;
                const costUSD = currency === 'USD' ? costInInputCurrency : costInInputCurrency * rates.USD;
                const costGBP = currency === 'GBP' ? costInInputCurrency : costInInputCurrency * rates.GBP;
                const costBRL = currency === 'BRL' ? costInInputCurrency : costInInputCurrency * rates.BRL;
                const costSEK = currency === 'SEK' ? costInInputCurrency : costInInputCurrency * rates.SEK;

                if (results.length > 0) results.push(`<br>`);
                results.push(`<strong>Real Currency Value:</strong> ${costPLN.toFixed(2)} PLN | ${costEUR.toFixed(2)} EUR | ${costUSD.toFixed(2)} USD | ${costGBP.toFixed(2)} GBP | ${costBRL.toFixed(2)} BRL | ${costSEK.toFixed(2)} SEK`);
            } catch (error) {
                results.push(`<br><span style="color: #e74c3c;">${error.message}</span>`);
            }
        }
    }

    // Display results with animation
    if (results.length > 0) {
        resultDiv.classList.remove('show', 'loading-state');
        void resultDiv.offsetWidth; // Trigger reflow to restart animation
        resultDiv.innerHTML = results.join('<br>');
        setTimeout(() => {
            resultDiv.classList.add('show');
        }, 10);
    } else {
        resultDiv.classList.remove('show', 'loading-state');
        resultDiv.innerHTML = '<span style="color: #95a5a6;">Enter values to see conversions</span>';
    }
}

// Event listeners for real-time updates
currencyTypeSelect.addEventListener('change', function() {
    updateAmountLabel();
    calculate();
});

amountInput.addEventListener('input', calculate);
tcMarketPriceInput.addEventListener('input', calculate);
tc250PriceInput.addEventListener('input', calculate);
currencySelect.addEventListener('change', calculate);

// Reset button
resetButton.addEventListener('click', function() {
    document.getElementById('unified-calculator-form').reset();
    tcMarketPriceInput.value = '40000'; // Restore default
    resultDiv.classList.remove('show', 'loading-state');
    resultDiv.innerHTML = '';
    updateAmountLabel();
});

// Initialize
updateAmountLabel();
