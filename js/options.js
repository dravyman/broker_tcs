'use strict';

import {
    LOGIN_URL,
    OPTION_ALERT,
    OPTION_ALERT_TODAY,
    OPTION_ALERT_TODAY_PER_SYMBOL,
    OPTION_ALERT_TODAY_VALUE,
    OPTION_ALERT_TODAY_VALUE_PER_SYMBOL,
    OPTION_COSMETICS,
    OPTION_REDIRECT,
    OPTION_SESSION,
    port,
    TICKER_LIST,
    INTERVAL_TO_CHECK,
} from "/js/constants.mjs";

const debounce = (func, delay) => {
    let inDebounce;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(inDebounce);
        inDebounce = setTimeout(() => func.apply(context, args), delay)
    }
};
const throttle = (func, limit) => {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now()
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now()
                }
            }, limit - (Date.now() - lastRan))
        }
    }
};
port.onMessage.addListener(function (msg) {
    console.log(`Option - message received ${msg.result}`);
    switch (msg.result) {
        case 'updatePrice':
            create_table(msg.stocks);
            break;
        case 'listStock':
            create_table(msg.stocks);
            setAddButtonHandler();
            break;
        case 'listPortfolio':
            create_portfolio_table(msg.stocks);
            break;
        case 'tickerInfo':
            create_table(msg.stocks);
            break;
        case 'session':
            if (msg.sessionId) {
                document.getElementById('message').innerText = 'Активная сессия';
                document.getElementById('error_message').innerHTML = '';
            } else {
                document.getElementById('message').innerText = '';
                document.getElementById('error_message').innerHTML = 'Сессия истекла. <a target="_blank" href="' + LOGIN_URL + '">Залогиниться</a>';
            }
            // дизейблим пункты связанные с получением данных онлайн
            let op = document.getElementById("add_list_type").getElementsByTagName("option");
            for (let i = 0; i < op.length; i++) {
                op[i].disabled = !msg.sessionId
            }
            break;
    }
});

// назначаем динамически handler для отслеживания кнопки Добавить
function setAddButtonHandler() {
    Array.from(document.getElementsByClassName("addTicker")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            let ticker = button.dataset.ticker;
            let showName = button.dataset.showname;
            let buy_price = button.parentElement.parentElement.cells.item(3).getElementsByTagName('input')[0].value;
            let sell_price = button.parentElement.parentElement.cells.item(2).getElementsByTagName('input')[0].value;
            let date = button.parentElement.parentElement.cells.item(4).getElementsByTagName('input')[0].value;
            let alert = {
                ticker: ticker,
                showName: showName,
                buy_price: buy_price,
                sell_price: sell_price,
                active: true,
                best_before: date
            };

            chrome.storage.sync.get([TICKER_LIST], function (data) {
                let alert_data = data[TICKER_LIST] || [];
                alert_data.push(alert);
                port.postMessage({method: "updatePrices"});
                chrome.storage.sync.set({[TICKER_LIST]: alert_data}, function () {
                    console.log('Save ticker ' + JSON.stringify(alert_data));
                })
            });

        })
    });
}

// Удаление из списка
function setDeleteButtonHandler() {
    Array.from(document.getElementsByClassName("deleteTicker")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            let index = button.dataset.index;
            chrome.storage.sync.get([TICKER_LIST], function (data) {
                let alert_data = data[TICKER_LIST] || [];
                alert_data.splice(index, 1);
                chrome.storage.sync.set({[TICKER_LIST]: alert_data}, function () {
                    console.log('Save ticker ' + JSON.stringify(alert_data));
                })
            });
        });

    })
}

/*
function setRefreshHandler() {
    document.getElementById('updatePrice').addEventListener('click', function () {
        port.postMessage({method: "updatePrices"});
    }, false);
}
*/
function create_portfolio_table(data) {
    let table = document.createElement('table');
    table.className = 'alertPriceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    th1.className = 'sorting';
    let th2 = document.createElement('th');
    th2.innerHTML = 'текущие цены брокера';
    th2.className = 'sorting';
    let th3 = document.createElement('th');
    th3.innerHTML = 'изменение за день';
    th3.className = 'sorting';
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('средняя цена покупки'));
    th4.className = 'sorting';
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('кол-во'));
    th5.className = 'sorting';
    let th6 = document.createElement('th');
    th6.appendChild(document.createTextNode('текущая стоимость'));
    th6.className = 'sorting';
    let th7 = document.createElement('th');
    th7.appendChild(document.createTextNode('доход на данный момент'));
    th7.className = 'sorting';
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    tr.appendChild(th6);
    tr.appendChild(th7);
    table.appendChild(tr);

    data.forEach(function (element, i) {
        let tr = document.createElement('tr');
        let td1 = document.createElement('td');
        td1.innerHTML = element.symbol.showName + '<br>' + '<strong>' + element.symbol.ticker + '</strong>';
        let td2 = document.createElement('td');
        td2.innerHTML =
            '<div data-ticker="' + element.ticker + '" class="onlineAverage" title="Последняя цена">' + element.prices.last.value + '</div>' +
            '<div data-ticker="' + element.ticker + '" class="onlineBuy"  title="Цена покупки">' +
            element.prices.buy.value.toLocaleString('ru-RU', {
                style: 'currency',
                currency: element.prices.buy.currency
            }) + '</div>' +
            '<div data-ticker="' + element.ticker + '" class="onlineSell"  title="Цена продажи">' + element.prices.sell.value + '</div>';
        let td3 = document.createElement('td');
        td3.innerHTML = element.earnings.absolute.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.earnings.absolute.currency
        }) + '<br>' + element.earnings.relative.toLocaleString('ru-RU', {
            style: 'percent',
            maximumSignificantDigits: 2
        });
        td3.className = element.earnings.absolute.value / 1 < 0 ? 'onlineSell' : 'onlineBuy';
        let td4 = document.createElement('td');
        td4.innerHTML = element.symbol.averagePositionPrice.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.averagePositionPrice.currency
        });

        let td5 = document.createElement('td');
        td5.innerHTML = element.symbol.lotSize;

        let td6 = document.createElement('td');
        td6.innerHTML = element.symbol.currentAmount.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.currentAmount.currency
        });

        let td7 = document.createElement('td');
        td7.className = element.symbol.expectedYield.value / 1 < 0 ? 'onlineSell' : 'onlineBuy';
        td7.innerHTML = element.symbol.expectedYield.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.expectedYield.currency
        }) + '<br>' + (element.symbol.expectedYieldRelative / 100).toLocaleString('ru-RU', {
            style: 'percent',
            maximumSignificantDigits: 2
        });

        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);
        tr.appendChild(td6);
        tr.appendChild(td7);

        table.appendChild(tr);
    });

    document.getElementById('portfolio').innerText = '';

    document.getElementById('portfolio').appendChild(table);
    tinysort(table.querySelectorAll('tr')
        , {
            selector: 'td'

        });
}

// рендер таблицы с акциями
function create_table(data) {
    let table = document.createElement('table');
    table.className = 'priceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.appendChild(document.createTextNode('последняя'));
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('продажа'));
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('покупка'));
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('заявка активна до'));
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    table.appendChild(tr);
    if (data && data.length > 0) {
        data.forEach(function (element) {
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.innerHTML = element.symbol.showName + '<br>' + '<strong>' + element.symbol.ticker + '</strong>';
            let td2 = document.createElement('td');
            td2.appendChild(document.createTextNode(element.prices.last.value + element.prices.last.currency));
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            //td3.innerHTML = element.prices.buy.value + element.prices.buy.currency + '<br>' + '<input class="tickerPrice buy" type="number" >';
            td3.innerHTML = '<input class="tickerPrice buy" type="number" >';
            td3.className = 'tickerCol';
            let td4 = document.createElement('td');
            //td4.innerHTML = element.prices.sell.value + element.prices.sell.currency + '<br>' + '<input class="tickerPrice sell" type="number">';
            td4.innerHTML = '<input class="tickerPrice sell" type="number">';
            td4.className = 'tickerCol';
            let td5 = document.createElement('td');
            td5.className = 'tickerCol';
            td5.innerHTML = '<input type="button" class="addTicker" data-showname="' + element.symbol.showName + '" data-ticker="' + element.symbol.ticker + '" value="Добавить">';
            let td6 = document.createElement('td');
            td6.className = 'tickerCol';
            td6.innerHTML = '<input type="datetime-local" title="Если не установлено то бесрочно">';
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td6);
            tr.appendChild(td5);
            table.appendChild(tr);
        })
    }
    document.getElementById('table').innerText = '';

    document.getElementById('table').appendChild(table);
}

// рендер таблицы с акциями ранее сохраненные
function create_alert_table() {
    let table = document.createElement('table');
    table.className = 'alertPriceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.innerHTML = 'текущие цены <br><!--<input type="button" value="Обновить вручную" id="updatePrice" title="Обновить цены вручную">-->';
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('продажа по достижению цены'));
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('покупка по достижению цены'));
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('заявка активна до'));
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    table.appendChild(tr);
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        if (data[TICKER_LIST] && data[TICKER_LIST].length > 0) {
            data[TICKER_LIST].forEach(function (element, i) {
                let tr = document.createElement('tr');
                let td1 = document.createElement('td');
                td1.innerHTML = element.showName + '<br>' + '<strong>' + element.ticker + '</strong>';
                let td2 = document.createElement('td');
                td2.innerHTML =
                    '<div data-ticker="' + element.ticker + '" class="onlineAverage" title="Последняя цена">' + element.online_average_price + '</div>' +
                    '<div data-ticker="' + element.ticker + '" class="onlineBuy"  title="Цена покупки">' + element.online_buy_price + element.currency + '</div>' +
                    '<div data-ticker="' + element.ticker + '" class="onlineSell"  title="Цена продажи">' + element.online_sell_price + '</div>';
                let td3 = document.createElement('td');
                td3.innerHTML = element.sell_price;
                td3.className = 'onlineBuy';
                let td4 = document.createElement('td');
                td4.innerHTML = element.buy_price;
                td4.className = 'onlineSell';
                let td5 = document.createElement('td');
                td5.className = '';
                let alert_date = new Date(Date.parse(element.best_before));
                td5.innerHTML = element.best_before ? alert_date.toLocaleDateString() + ' ' + alert_date.toLocaleTimeString() : 'бесрочно';
                let td6 = document.createElement('td');
                td6.innerHTML = '<input class="deleteTicker" data-index="' + i + '" type="button" value="X" title="Удалить">';
                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                tr.appendChild(td4);
                tr.appendChild(td5);
                tr.appendChild(td6);

                table.appendChild(tr);
                setDeleteButtonHandler();
                //setRefreshHandler();

            })
        }
    });
    document.getElementById('alert_table').innerText = '';

    document.getElementById('alert_table').appendChild(table);

}

// подгрузка списка акций по типу
document.getElementById('add_list_type').addEventListener('change', function (e) {
    document.getElementById('symbol_name').disabled = true;
    document.getElementById('symbol_name').value = '';
    switch (e.target.value) {
        case "2": // портфель
            document.getElementById('table').innerText = '';
            port.postMessage({method: "getListStock", params: 2});
            break;
        case "3": // избранное
            document.getElementById('table').innerText = '';
            port.postMessage({method: "getListStock", params: 3});
            break;
        case "1": // вручную
            document.getElementById('table').innerText = '';
            document.getElementById('symbol_name').disabled = false;
            break;
        default:
            document.getElementById('table').innerText = '';
            document.getElementById('symbol_name').disabled = true;
    }
});
document.getElementById('alert_list').addEventListener('change', function (e) {
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('alert_table').style.display = 'block';
});
document.getElementById('add_alert_list').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('price_table').style.display = 'block';
});

// подгрузка списка акций по названию
document.getElementById('symbol_name').addEventListener('input', function (e) {
    if (e.target.value) {
        throttle(port.postMessage({method: "getListStock", params: e.target.value}), 500);
    }
});

// сохраняем применение косметического фильтра
document.getElementById(OPTION_COSMETICS).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_COSMETICS]: e.target.checked}, function () {
        console.log('Cosmetic option set to ' + e.target.checked);
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_COSMETICS], function (result) {
    console.log('get css filter option');
    document.getElementById(OPTION_COSMETICS).checked = result[OPTION_COSMETICS] === true;
});

// сохраняем применение Редиректа
document.getElementById(OPTION_REDIRECT).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_REDIRECT]: e.target.checked}, function () {
        console.log('Redirect option set to ' + e.target.checked);
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_REDIRECT], function (result) {
    console.log('get redirect option');
    document.getElementById(OPTION_REDIRECT).checked = result[OPTION_REDIRECT] === true;
});

// сохраняем применение Сессия
document.getElementById(OPTION_SESSION).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_SESSION]: e.target.checked}, function () {
        console.log('Redirect option set to ' + e.target.checked);
        document.getElementById(OPTION_ALERT).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY_VALUE).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).disabled = !e.target.checked;
        document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).disabled = !e.target.checked;
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_SESSION], function (result) {
    console.log('get session option');
    document.getElementById(OPTION_SESSION).checked = result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY_VALUE).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).disabled = !result[OPTION_SESSION];
    document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).disabled = !result[OPTION_SESSION];
});

// сохраняем применение Покупка Продажа
document.getElementById(OPTION_ALERT).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT]: e.target.checked}, function () {
        console.log('Alert option set to ' + e.target.checked);
    })
});

// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT], function (result) {
    console.log('get alert option');
    document.getElementById(OPTION_ALERT).checked = result[OPTION_ALERT] === true;
});

// сохраняем применение Изменение цены за день
document.getElementById(OPTION_ALERT_TODAY).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY]: e.target.checked}, function () {
        console.log('Alert_today option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY], function (result) {
    console.log('get alert_today option');
    document.getElementById(OPTION_ALERT_TODAY).checked = result[OPTION_ALERT_TODAY] === true;
});

// сохраняем величину уменьшения увеличения портфеля
document.getElementById(OPTION_ALERT_TODAY_VALUE).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY_VALUE]: e.target.value}, function () {
        console.log('Alert_today_value option set to ' + e.target.value);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE], function (result) {
    console.log('get alert_today_value option');
    document.getElementById(OPTION_ALERT_TODAY_VALUE).value = result[OPTION_ALERT_TODAY_VALUE] || 2;
});

// сохраняем применение Изменение цены по бумаге за день
document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY_PER_SYMBOL]: e.target.checked}, function () {
        console.log('Alert_today_per_symbol option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_PER_SYMBOL], function (result) {
    console.log('get Alert_today_per_symbol option');
    document.getElementById(OPTION_ALERT_TODAY_PER_SYMBOL).checked = result[OPTION_ALERT_TODAY_PER_SYMBOL] === true;
});

// сохраняем величину уменьшения увеличения по отдельной бумаге
document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL]: e.target.value}, function () {
        console.log('Alert_today_value_per_symbol option set to ' + e.target.value);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE_PER_SYMBOL], function (result) {
    console.log('get Alert_today_value_per_symbol option');
    document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).value = result[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL] || 5;
});

// перерисовываем таблицу с уведомлениями при изменении Storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        if (key === TICKER_LIST) {
            debounce(create_alert_table(), 1000);
        }
    }
});
// запрашиваем права на выдачу уведомлений
if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission(function (status) {
        if (Notification.permission !== status) {
            Notification.permission = status;
        }
    });
}
(function getAppVersion() {
    let manifestData = chrome.runtime.getManifest();
    document.getElementById('app_version').innerText = manifestData.version;
})();
create_alert_table();
port.postMessage({method: "getSession"});
port.postMessage({method: "updatePrices"});
port.postMessage({method: "getPortfolio"});

// запускаем фоновый пинг сервера + в нем все проверки
chrome.alarms.create("updatePortfolio", {
    delayInMinutes: INTERVAL_TO_CHECK,
    periodInMinutes: INTERVAL_TO_CHECK
});
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "updatePortfolio") {
        port.postMessage({method: "getPortfolio"});
    }
});