// Cache exchange rates to avoid multiple API calls
let exchangeRates = {};
let lastInputCurrency = null;

// Currency symbols map
const currencySymbols = {
    PLN: 'zł',
    EUR: '€',
    USD: '$',
    GBP: '£',
    BRL: 'R$',
    SEK: 'kr'
};

// Load preferences from localStorage
function loadPreferences() {
    const prefs = localStorage.getItem('tibiaConverterPrefs');
    return prefs ? JSON.parse(prefs) : null;
}

// Save preferences to localStorage
function savePreferences() {
    const prefs = {
        currencyType: currencyTypeSelect.value,
        tcMarketPrice: tcMarketPriceInput.value,
        currency: currencySelect.value,
        tc250Price: tc250PriceInput.value
    };
    localStorage.setItem('tibiaConverterPrefs', JSON.stringify(prefs));
}

// Generate currency grid HTML
function generateCurrencyGrid(costs, selectedCurrency) {
    const currencies = ['PLN', 'EUR', 'USD', 'GBP', 'BRL', 'SEK'];
    const copyText = currencies.map(code => `${code} ${costs[code].toFixed(2)}`).join(' | ');
    let html = `<div class="currency-grid" data-copy="${copyText}">`;
    currencies.forEach(code => {
        const isHighlighted = code === selectedCurrency ? 'highlighted' : '';
        const amount = costs[code].toFixed(2);
        html += `<div class="currency-item ${isHighlighted}">
            <span class="amount">${amount}</span>
            <span class="code">${code}</span>
        </div>`;
    });
    html += '</div>';
    return html;
}

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
const swapButton = document.getElementById('swap-button');
const copyButton = document.getElementById('copy-button');
const themeToggle = document.getElementById('theme-toggle');
const resultActions = document.querySelector('.result-actions');

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
                    const costs = {
                        PLN: currency === 'PLN' ? costInInputCurrency : costInInputCurrency * rates.PLN,
                        EUR: currency === 'EUR' ? costInInputCurrency : costInInputCurrency * rates.EUR,
                        USD: currency === 'USD' ? costInInputCurrency : costInInputCurrency * rates.USD,
                        GBP: currency === 'GBP' ? costInInputCurrency : costInInputCurrency * rates.GBP,
                        BRL: currency === 'BRL' ? costInInputCurrency : costInInputCurrency * rates.BRL,
                        SEK: currency === 'SEK' ? costInInputCurrency : costInInputCurrency * rates.SEK
                    };

                    results.push(`<br><strong>Real Currency Value:</strong>${generateCurrencyGrid(costs, currency)}`);
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
                const costs = {
                    PLN: currency === 'PLN' ? costInInputCurrency : costInInputCurrency * rates.PLN,
                    EUR: currency === 'EUR' ? costInInputCurrency : costInInputCurrency * rates.EUR,
                    USD: currency === 'USD' ? costInInputCurrency : costInInputCurrency * rates.USD,
                    GBP: currency === 'GBP' ? costInInputCurrency : costInInputCurrency * rates.GBP,
                    BRL: currency === 'BRL' ? costInInputCurrency : costInInputCurrency * rates.BRL,
                    SEK: currency === 'SEK' ? costInInputCurrency : costInInputCurrency * rates.SEK
                };

                if (results.length > 0) results.push(`<br>`);
                results.push(`<strong>Real Currency Value:</strong>${generateCurrencyGrid(costs, currency)}`);
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
        resultActions.style.display = 'flex';
    } else {
        resultDiv.classList.remove('show', 'loading-state');
        resultDiv.innerHTML = '<span style="color: #95a5a6;">Enter values to see conversions</span>';
        resultActions.style.display = 'none';
    }
}

// Event listeners for real-time updates
currencyTypeSelect.addEventListener('change', function() {
    updateAmountLabel();
    savePreferences();
    calculate();
});

amountInput.addEventListener('input', calculate);
tcMarketPriceInput.addEventListener('input', function() {
    savePreferences();
    calculate();
});
tc250PriceInput.addEventListener('input', function() {
    savePreferences();
    calculate();
});
currencySelect.addEventListener('change', function() {
    savePreferences();
    calculate();
});

// Reset button
resetButton.addEventListener('click', function() {
    document.getElementById('unified-calculator-form').reset();
    tcMarketPriceInput.value = '40000'; // Restore default
    resultDiv.classList.remove('show', 'loading-state');
    resultDiv.innerHTML = '';
    resultActions.style.display = 'none';
    updateAmountLabel();
});

// Swap button - toggle between GP and TC
swapButton.addEventListener('click', function() {
    swapButton.classList.toggle('rotating');
    currencyTypeSelect.value = currencyTypeSelect.value === 'gp' ? 'tc' : 'gp';
    updateAmountLabel();
    savePreferences();
    calculate();
});

// Copy button - copy result to clipboard
copyButton.addEventListener('click', function() {
    // Build copy text from result
    let textParts = [];

    // Get the GP/TC conversion (first strong elements contain this)
    const strongElements = resultDiv.querySelectorAll('strong');
    if (strongElements.length >= 2) {
        // First two strong elements are the conversion (e.g., "20,000,000 GP (20 kk)" and "500.00 TC")
        textParts.push(strongElements[0].textContent + ' = ' + strongElements[1].textContent);
    }

    // Get currency grid data if present
    const currencyGrid = resultDiv.querySelector('.currency-grid');
    if (currencyGrid && currencyGrid.dataset.copy) {
        textParts.push('Real Currency Value: ' + currencyGrid.dataset.copy);
    }

    const textToCopy = textParts.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('copied');
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.classList.remove('copied');
        }, 2000);
    });
});

// Theme toggle
themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('tibiaConverterDarkMode', isDark);
});

// Initialize
const savedPrefs = loadPreferences();
if (savedPrefs) {
    currencyTypeSelect.value = savedPrefs.currencyType || 'gp';
    tcMarketPriceInput.value = savedPrefs.tcMarketPrice || '40000';
    currencySelect.value = savedPrefs.currency || 'PLN';
    tc250PriceInput.value = savedPrefs.tc250Price || '';
}

// Load dark mode preference
if (localStorage.getItem('tibiaConverterDarkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

updateAmountLabel();
