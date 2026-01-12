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

// Update currency grid with values
function updateCurrencyGrid(costs, selectedCurrency) {
    const currencies = ['PLN', 'EUR', 'USD', 'GBP', 'BRL', 'SEK'];
    const currencyGrid = document.getElementById('currency-grid');

    if (costs) {
        const copyText = currencies.map(code => `${code} ${costs[code].toFixed(2)}`).join(' | ');
        currencyGrid.dataset.copy = copyText;
    } else {
        currencyGrid.dataset.copy = '';
    }

    currencies.forEach(code => {
        const item = currencyGrid.querySelector(`[data-currency="${code}"]`);
        const amountSpan = item.querySelector('.amount');

        if (costs) {
            amountSpan.textContent = costs[code].toFixed(2);
            item.classList.remove('placeholder');
            if (code === selectedCurrency) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        } else {
            amountSpan.textContent = '--';
            item.classList.add('placeholder');
            item.classList.remove('highlighted');
        }
    });
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
const resultFrom = document.getElementById('result-from');
const resultTo = document.getElementById('result-to');
const currencyGrid = document.getElementById('currency-grid');

// Update amount label based on currency type
function updateAmountLabel() {
    const currencyType = currencyTypeSelect.value;
    if (currencyType === 'gp') {
        amountLabel.textContent = 'GP Amount in kk:';
        amountInput.placeholder = 'e.g. 20';
        amountInput.step = '0.01';
    } else {
        amountLabel.textContent = 'Tibia Coin Amount:';
        amountInput.placeholder = 'e.g. 5000';
        amountInput.step = '1';
    }
}

// Helper to update conversion result display
function updateConversionResult(fromText, toText) {
    if (fromText && toText) {
        resultFrom.textContent = fromText;
        resultFrom.classList.remove('placeholder');
        resultTo.textContent = toText;
        resultTo.classList.remove('placeholder');
    } else {
        resultFrom.textContent = '--';
        resultFrom.classList.add('placeholder');
        resultTo.textContent = '--';
        resultTo.classList.add('placeholder');
    }
}

// Main calculation function
async function calculate() {
    const currencyType = currencyTypeSelect.value;
    const amount = parseFloat(amountInput.value);
    const tcMarketPrice = parseFloat(tcMarketPriceInput.value);
    const tc250Price = parseFloat(tc250PriceInput.value);
    const currency = currencySelect.value;

    let fromText = null;
    let toText = null;
    let tcAmountForFiat = null;

    if (currencyType === 'gp') {
        // Starting with GP
        if (amount && amount > 0) {
            const gpAmount = amount * 1000000;

            if (tcMarketPrice && tcMarketPrice > 0) {
                const tcAmount = gpAmount / tcMarketPrice;
                fromText = `${gpAmount.toLocaleString()} GP (${amount} kk)`;
                toText = `${tcAmount.toFixed(2)} TC`;
                tcAmountForFiat = tcAmount;
            }
        }
    } else {
        // Starting with TC
        if (amount && amount > 0) {
            tcAmountForFiat = amount;

            if (tcMarketPrice && tcMarketPrice > 0) {
                const gpAmount = amount * tcMarketPrice;
                const gpAmountKK = gpAmount / 1000000;
                fromText = `${amount.toLocaleString()} TC`;
                toText = `${gpAmount.toLocaleString()} GP (${gpAmountKK.toFixed(2)} kk)`;
            }
        }
    }

    // Update conversion result
    updateConversionResult(fromText, toText);

    // Calculate fiat currencies if we have TC amount and 250 TC price
    if (tcAmountForFiat && tc250Price && tc250Price > 0) {
        const costInInputCurrency = (tcAmountForFiat / 250) * tc250Price;
        try {
            const { rates } = await fetchExchangeRates(currency, false);
            const costs = {
                PLN: currency === 'PLN' ? costInInputCurrency : costInInputCurrency * rates.PLN,
                EUR: currency === 'EUR' ? costInInputCurrency : costInInputCurrency * rates.EUR,
                USD: currency === 'USD' ? costInInputCurrency : costInInputCurrency * rates.USD,
                GBP: currency === 'GBP' ? costInInputCurrency : costInInputCurrency * rates.GBP,
                BRL: currency === 'BRL' ? costInInputCurrency : costInInputCurrency * rates.BRL,
                SEK: currency === 'SEK' ? costInInputCurrency : costInInputCurrency * rates.SEK
            };
            updateCurrencyGrid(costs, currency);
        } catch (error) {
            // Keep placeholders on error
            updateCurrencyGrid(null, null);
        }
    } else {
        // Reset currency grid to placeholders
        updateCurrencyGrid(null, null);
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
    updateConversionResult(null, null);
    updateCurrencyGrid(null, null);
    savePreferences();
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
    let textParts = [];

    // Get the GP/TC conversion
    const fromText = resultFrom.textContent;
    const toText = resultTo.textContent;
    if (fromText !== '--' && toText !== '--') {
        textParts.push(fromText + ' = ' + toText);
    }

    // Get currency grid data if present
    if (currencyGrid.dataset.copy) {
        textParts.push('Real Currency Value: ' + currencyGrid.dataset.copy);
    }

    if (textParts.length === 0) {
        return; // Nothing to copy
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

// Keyboard navigation - Enter moves to next empty field
const inputFields = [amountInput, tcMarketPriceInput, tc250PriceInput];
inputFields.forEach((field, index) => {
    field.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Find next empty field
            for (let i = index + 1; i < inputFields.length; i++) {
                if (!inputFields[i].value) {
                    inputFields[i].focus();
                    return;
                }
            }
            // If all fields after are filled, check from beginning
            for (let i = 0; i < index; i++) {
                if (!inputFields[i].value) {
                    inputFields[i].focus();
                    return;
                }
            }
            // All fields filled - blur to dismiss keyboard on mobile
            field.blur();
        }
    });
});

// Initialize
const savedPrefs = loadPreferences();
if (savedPrefs) {
    currencyTypeSelect.value = savedPrefs.currencyType || 'gp';
    tcMarketPriceInput.value = savedPrefs.tcMarketPrice || '';
    currencySelect.value = savedPrefs.currency || 'PLN';
    tc250PriceInput.value = savedPrefs.tc250Price || '';
}

// Load dark mode preference
if (localStorage.getItem('tibiaConverterDarkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

updateAmountLabel();

// Initialize placeholder states
resultFrom.classList.add('placeholder');
resultTo.classList.add('placeholder');
document.querySelectorAll('#currency-grid .currency-item').forEach(item => {
    item.classList.add('placeholder');
});

// Calculate with any saved preferences
calculate();
