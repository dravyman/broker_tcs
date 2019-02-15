'use strict';

import {
    ALERT_TICKER_LIST,
    BUY_LINK,
    EVENTS_LINK,
    INTERVAL_TO_CHECK,
    LOGIN_URL,
    OPTION_ALERT,
    OPTION_ALERT_TODAY,
    OPTION_ALERT_TODAY_PER_SYMBOL,
    OPTION_ALERT_TODAY_VALUE,
    OPTION_ALERT_TODAY_VALUE_PER_SYMBOL,
    OPTION_ALPHAVANTAGE,
    OPTION_ALPHAVANTAGE_KEY,
    OPTION_CONVERT_TO_RUB,
    OPTION_COSMETICS,
    OPTION_REDIRECT,
    OPTION_SESSION,
    OPTION_SORT_BY_NEAREST,
    port,
    PROGNOS_LINK,
    SELL_LINK,
    SYMBOL_LINK,
    TICKER_LIST
} from "/js/constants.mjs";
import {giveLessDiffToTarget, sortAlertRow} from "./utils/sortUtils.js";
import {fillCashData, msToTime} from "./utils/displayUtils.js";
import {debounce, throttle} from "./utils/systemUtils.js";


document.getElementById('toggle_info').addEventListener('click', function (event) {

    let toggle = function (elem) {
        elem.classList.toggle('is-visible');
    };

    if (!event.target.classList.contains('toggle')) return;

    event.preventDefault();

    let content = document.querySelector(event.target.hash);
    if (!content) return;

    toggle(content);

}, false);

port.onMessage.addListener(function (msg) {
    console.log(`Option - message received ${msg.result}`);
    switch (msg.result) {
        case 'listStock':
            create_table(msg.stocks || msg.stocks_tcs.concat(msg.stocks_iis));
            break;
        case 'listStockForOrder':
            create_orders_table(msg.stocks || msg.stocks_tcs.concat(msg.stocks_iis));
            //setAddButtonHandler();
            break;
        case 'listPortfolio':
            create_portfolio_table('portfolioTCS', msg.stocks_tcs);
            let iisStyle = 'none';
            if (msg.stocks_tcs.length < 14 || document.getElementById('iis_portfolio_input').checked)
                iisStyle = 'block';
            create_portfolio_table('portfolioIIS', msg.stocks_iis);
            document.getElementById('portfolioIIS').style = 'display:' + iisStyle;
            break;
        case 'listAlerts':
            create_alert_table(msg.stocks);
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
                document.getElementById('error_message').innerHTML = `Сессия истекла. <a target="_blank" href="${LOGIN_URL}">Залогиниться</a>`;
            }
            // дизейблим пункты связанные с получением данных онлайн
            let op = document.getElementById("add_list_type").getElementsByTagName("option");
            for (let i = 0; i < op.length; i++) {
                op[i].disabled = !msg.sessionId
            }
            break;
        case 'updatePopup':
            //document.getElementById('timestamp').innerText=msg.timestamp;
            document.getElementById('sum').innerText = msg.totalAmountPortfolio.toLocaleString('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            });

            if (msg.expectedYield > 0) document.getElementById('all').classList.add("onlineBuy");
            else document.getElementById('all').classList.add("onlineSell");
            document.getElementById('earnedAll').innerText = msg.expectedYield.toLocaleString('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            });
            document.getElementById('earnedAllPercent').innerText = msg.expectedYieldRelative.toLocaleString('ru-RU', {
                style: 'percent',
                minimumFractionDigits: 2
            });

            if (msg.expectedYieldPerDay > 0) document.getElementById('day').classList.add("onlineBuy");
            else document.getElementById('day').classList.add("onlineSell");
            document.getElementById('earnedToday').innerText = msg.expectedYieldPerDay.toLocaleString('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            });
            document.getElementById('earnedTodayPercent').innerText = msg.expectedYieldPerDayRelative.toLocaleString('ru-RU', {
                style: 'percent',
                minimumFractionDigits: 2
            });

            break;
        case 'updateUserInfo':
            if (msg.status) {
                document.getElementById('portfolioTCS').innerHTML = '<h2>API брокера недоступен, возможно идет обновление</h2>';
                break;
            }
            document.getElementById('riskProfile').innerText = msg.riskProfile;
            document.getElementById('qualStatus').innerText = msg.qualStatus;
            if (msg.qualStatus === 'есть статус') {
                document.getElementById('alphavantage_option').style = 'display:block';
            }
            document.getElementById('approvedW8').innerText = msg.approvedW8;
            document.getElementById('employee').innerHTML = msg.employee ? 'Вы сотрудник банка 🏦💲☝"<br>' : '';
            let iis = (msg.accounts.filter(item => item.accountType === 'TinkoffIis' && item.hasOperations)).length > 0
                ? '<input type="radio" value="0" checked="checked" name="broker_type" id="broker_portfolio_input">' +
                '<label for="broker_portfolio_input">Портфель Тинькофф и БКС</label>' : '';
            let tcs = (msg.accounts.filter(item => item.accountType === 'Tinkoff' && item.hasOperations)).length > 0
                ? '<input type="radio" value="1" name="broker_type" id="iis_portfolio_input">' +
                '<label for="iis_portfolio_input">Портфель ИИС</label>' : '';
            if (iis && tcs) {
                document.getElementById('accounts').innerHTML = iis + tcs;
                document.getElementById('broker_portfolio_input').addEventListener('change', function () {
                    let tableTCS = document.getElementById('portfolioTCS');
                    let tableIIS = document.getElementById('portfolioIIS');
                    tableTCS.style = 'display:block';
                    tableIIS.style = 'display:none';
                });
                document.getElementById('iis_portfolio_input').addEventListener('change', function () {
                    let tableTCS = document.getElementById('portfolioTCS');
                    let tableIIS = document.getElementById('portfolioIIS');
                    tableIIS.style = 'display:block';
                    tableTCS.style = 'display:none';
                });
            }
            break;
        case 'cashDataTCS':
            fillCashData(msg, 'Остаток на счете ТКС ', 'cashTCS');
            break;
        case 'cashDataBCS':
            fillCashData(msg, 'Остаток на счете БКС ', 'cashBCS');
            break;
        case 'cashDataIIS':
            fillCashData(msg, 'Остаток на счете ИИС ', 'cashIIS');
            break;
        case 'versionAPI':
            document.getElementById('versionAPI').innerText = `Версия API ${msg.version.payload.version}`;
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
            let buy_price = document.getElementById('buy_price_' + button.dataset.ticker).value;
            let sell_price = document.getElementById('sell_price_' + button.dataset.ticker).value;
            let mobile_alert = document.getElementById('mobile_alert_' + button.dataset.ticker).checked;
            let date = document.getElementById('datetime_' + button.dataset.ticker).value;
            let mobile_alert_price;
            if (mobile_alert && buy_price && sell_price) {
                mobile_alert_price = prompt('Вы указали одновременно и цену покупки и продажи\nДля мобильного уведомления нужно указать только одну (last price), введите интересующую стоимость для ' + button.dataset.ticker, buy_price);
            }
            if (mobile_alert) {
                mobile_alert_price = parseFloat(mobile_alert_price || buy_price || sell_price); // только одна цена для мобильного
                // отправляем запрос на создание моб уведомления
                port.postMessage({method: "createMobileAlert", params: {ticker: ticker, price: mobile_alert_price}});
            }
            let alert_symbol = {
                ticker: ticker,
                showName: showName,
                buy_price: buy_price,
                sell_price: sell_price,
                active: true,
                best_before: date
            };

            chrome.storage.sync.get([TICKER_LIST], function (data) {
                let alert_data = data[TICKER_LIST] || [];
                alert_data.push(alert_symbol);
                let new_alert_date = alert_data.filter(item => !!item);
                chrome.storage.sync.set({[TICKER_LIST]: new_alert_date}, function () {
                    console.log('Save ticker ' + JSON.stringify(new_alert_date));
                    alert('Добавлено в список отслеживания в браузере' + (mobile_alert ? ' и уведомление в приложении брокера' : ''));
                })
            });

        }, {
            once: true,
        })
    });
}

// Удаление из списка
function setDeleteButtonHandler() {
    // очень некрасиво, но пока так
    Array.from(document.getElementsByClassName("deleteTicker")).forEach(function (input) {
        input.addEventListener('click', function (e) {
            let button = e.target;
            let ticker = button.dataset.index;
            if (/^\d+$/.test(ticker) && confirm("Завка будет снята, Вы уверены?")) {
                port.postMessage({method: "deleteOrder", params: ticker});
            } else
                chrome.storage.sync.get([TICKER_LIST], function (data) {
                    let alert_data = data[TICKER_LIST] || [];
                    let new_alert_date = alert_data.filter(item => !(!!item && (item.ticker + (item.sell_price || '0') + (item.buy_price || '0')) === ticker));
                    chrome.storage.sync.set({[TICKER_LIST]: new_alert_date}, function () {
                        console.log('Save ticker ' + JSON.stringify(new_alert_date));
                        //create_alert_table(alert_data);
                    })
                });
        }, {
            once: true,
        });
    })
}

// Логика изменения при вводе данных в Онлайн заявки
function setChangeOrderHandler() {
    Array.from(document.getElementsByClassName("tickerOrderBuyPrice")).forEach(function (input) {
        input.addEventListener('input', function (e) {
            let input = e.target;
            if (input.value) {
                input.parentElement.parentElement.cells.item(3).getElementsByTagName('input')[0].value;
            }
        }, {
            once: true,
        });
    })
}

function create_portfolio_table(divId, data) {
    let old_table = document.getElementById(divId + '_table');
    let table = document.createElement('table');
    table.className = (old_table) ? old_table.className : 'alertPriceTable';
    table.id = divId + '_table';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    //th1.appendChild(document.createTextNode('название'));
    th1.className = 'sorting';
    let th2 = document.createElement('th');
    th2.innerHTML = 'цены брокера';
    th2.className = 'sorting';
    let th3 = document.createElement('th');
    th3.innerHTML = 'средняя цена прогноз';
    th3.className = 'sorting';
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('измн. за день'));
    th4.className = 'sorting';
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('кол-во'));
    th5.className = 'sorting';
    let th6 = document.createElement('th');
    th6.appendChild(document.createTextNode('текущая стоимость'));
    th6.className = 'sorting';
    let th7 = document.createElement('th');
    th7.appendChild(document.createTextNode('доход на тек. момент'));
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
        td1.className = 'maxWidth';

        let img_status = '/icons/pre.png';
        let session_open = (element.symbol.marketStartTime || 'нет информации');
        let session_close = (element.symbol.marketEndTime || 'нет информации');
        if (element.symbol.premarketStartTime !== element.symbol.premarketEndTime) {
            session_open += ' премаркет с ' + element.symbol.premarketStartTime;
            session_close += ' премаркет до ' + element.symbol.premarketEndTime
        }
        if (element.exchangeStatus === 'Close') img_status = '/icons/closed.png';
        else if (element.exchangeStatus === 'Open') img_status = '/icons/open.png';
        let otc = element.symbol.isOTC ? '<span title="Внебиржевой инструмент\r\nДоступна только последняя цена, недоступна дневная доходность">📊</span>' : '';
        let etf = element.symbol.symbolType === 'ETF' ? '<span title="ETF">📈</span>' : '';
        let currency = element.symbol.symbolType === 'Currency' ? '<span title="Валюта">💰</span>' : '';
        let bond = element.symbol.symbolType === 'Bond' ? '<span title="Бонды">📒</span>' : '';
        let country = '';
        if (otc === '' && etf === '' && bond === '' && currency === '') country = element.prices.buy.currency === 'RUB' ? '🇷🇺' : '🇺🇸';
        let mobile_alert = element.symbol.subscriptId ? `<span title="Уведомление добавлено на мобильном по цене ${element.subscriptPrice}">📳</span>` : '';
        td1.innerHTML = `<span title="${element.symbol.showName}">${element.symbol.showName}</span><br><img class="symbolStatus" alt="Статус биржи" 
        title="Биржа открыта с ${session_open}\r\nБиржа закрыта с ${session_close}" src="${img_status}"><span class="icon">${country}${otc}${etf}${currency}${bond}${mobile_alert}</span>
        <a title="Открыть на странице брокера"  href="${SYMBOL_LINK.replace('${securityType}', element.symbol.securityType)}${element.symbol.ticker}" target="_blank"><strong>${element.symbol.ticker}</strong></a>`;
        let td2 = document.createElement('td');
        td2.innerHTML = `<div data-last-ticker="${element.symbol.ticker}" class="onlineAverage" title="${element.symbol.isOTC ? 'Для внебиржевых бумаг выводит средняя цена между ценой покупки и продажи, обновляется брокером раз в час' : 'Последняя цена'}">${element.prices.last.value}</div>` +
            (element.symbol.isOTC && element.symbol.lastOTC ? `<span class="lastOTC" title="Цена получена со стороннего сервиса. Может не совпадать с ценой брокера, но наиболее близкая к рыночной, обновляется каждую минуту">${element.symbol.lastOTC}<sup>*</sup></span>` : '') +
            (element.prices.buy ? `<div data-buy-ticker="${element.symbol.ticker}" title="Цена покупки">
            <a class="onlineBuy" href="${BUY_LINK}${element.symbol.ticker}" target="_blank" title="Купить">${element.prices.buy ? element.prices.buy.value.toLocaleString('ru-RU', {
                style: 'currency',
                currency: element.prices.buy.currency,
                minimumFractionDigits: element.prices.buy.value < 0.1 ? 4 : 2
            }) : ''}</a></div>` : '') +
            (element.prices.sell ? `<div data-sell-ticker="${element.symbol.ticker}"   title="Цена продажи">
            <a class="onlineSell" href="${SELL_LINK}${element.symbol.ticker}" target="_blank" title="Продать">${element.prices.sell ? element.prices.sell.value : ''}</a>
            </div>` : '');
        let prognosis_style = element.contentMarker.prognosis && element.symbol.consensus.consRecommendation === 'Покупать' ? 'onlineBuy' : 'onlineSell';
        let prognosis_link = element.contentMarker.prognosis ? `<br><a class="${prognosis_style}" href="${PROGNOS_LINK.replace('${symbol}', element.symbol.ticker)}" target="_blank" title="Сводная рекомендация: ${element.symbol.consensus.consRecommendation}">
        ${element.symbol.consensus.consensus.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.consensus.currency,
            minimumFractionDigits: element.symbol.consensus.consensus < 0.1 ? 4 : 2
        })}
        </a><span class="percent" title="Прогнозируемое изменение с учетом текущей цены">
        ${prognosis_style === 'onlineBuy' ? '+' : '-'}${element.symbol.consensus.priceChangeRel.toFixed(2)} %
        </span>` : '';

        let td3 = document.createElement('td');
        td3.width = '120';
        td3.align = 'left';
        let events_url = EVENTS_LINK.replace('${symbol}', element.symbol.ticker);
        if (element.symbol.averagePositionPrice.value === 0)
            td3.innerHTML = `<div data-ticker="${element.symbol.ticker}">Ошибка в данных у брокера</div>`;
        else
            td3.innerHTML = `<div data-ticker="${element.symbol.ticker}"><a href="${events_url}" target="_blank" title="Транзакции">${element.symbol.averagePositionPrice.value.toLocaleString('ru-RU', {
                style: 'currency',
                currency: element.symbol.averagePositionPrice.currency,
                minimumFractionDigits: element.symbol.averagePositionPrice.value < 0.1 ? 4 : 2
            })}</a>${prognosis_link}</div>`;
        let td4 = document.createElement('td');
        td4.innerHTML = `<div data-daysum-ticker="${element.symbol.ticker}">${element.earnings ? element.earnings.absolute.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.earnings.absolute.currency,
            minimumFractionDigits: Math.abs(element.earnings.absolute.value) < 1 ? 4 : 2
        }) : element.symbol.isOTC && element.symbol.absoluteOTC ? element.symbol.absoluteOTC.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.averagePositionPrice.currency,
            minimumFractionDigits: element.symbol.absoluteOTC < 0.1 ? 4 : 2
        }) : ''}</div>
        <div data-daypercent-ticker="${element.symbol.ticker}"><strong>${element.earnings ? element.earnings.relative.toLocaleString('ru-RU', {
            style: 'percent',
            maximumSignificantDigits: 2
        }) : element.symbol.isOTC && element.symbol.relativeOTC ? element.symbol.relativeOTC.toLocaleString('ru-RU', {
            style: 'percent',
            maximumSignificantDigits: 2
        }) : ''}</strong></div>
        <div title="Доход за день, расчитывается на основе цены открытия">${element.earnings ? element.symbol.earningToday.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.currentAmount.currency
        }) : element.symbol.isOTC && element.symbol.earningToday ? element.symbol.earningToday.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.currentAmount.currency
        }) : ''}</div>`;
        if (element.symbol.isOTC) td4.className = element.symbol.relativeOTC / 1 < 0 ? 'onlineSell' : 'onlineBuy'
        else td4.className = element.earnings ? element.earnings.absolute.value / 1 < 0 ? 'onlineSell' : 'onlineBuy' : '';


        let td5 = document.createElement('td');
        td5.innerHTML = `<div data-ticker="${element.symbol.ticker}">${element.symbol.lotSize}</div>`;

        let td6 = document.createElement('td');
        td6.innerHTML = `<div data-ticker="${element.symbol.ticker}">${element.symbol.currentAmount.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.currentAmount.currency
        })}</div>`;

        let td7 = document.createElement('td');
        td7.className = element.symbol.expectedYield.value / 1 < 0 ? 'onlineSell' : 'onlineBuy';
        td7.innerHTML = `<div data-ticker="${element.symbol.ticker}">${element.symbol.expectedYield.value.toLocaleString('ru-RU', {
            style: 'currency',
            currency: element.symbol.expectedYield.currency
        })}<br>${(element.symbol.expectedYieldRelative / 100).toLocaleString('ru-RU', {
            style: 'percent',
            maximumSignificantDigits: 2
        })}</div>`;

        tr.className = element.broker_type;
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);
        tr.appendChild(td6);
        tr.appendChild(td7);


        table.appendChild(tr);
    });

    document.getElementById(divId).innerText = '';

    document.getElementById(divId).appendChild(table);
    tinysort(table.querySelectorAll('tr')
        , {
            selector: 'td'
        });
}

// рендер таблицы с акциями для добавления
function create_table(data) {
    let table = document.createElement('table');
    table.className = 'priceTable';
    let tr = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.appendChild(document.createTextNode('название'));
    let th2 = document.createElement('th');
    th2.appendChild(document.createTextNode('последняя'));
    let th3 = document.createElement('th');
    th3.appendChild(document.createTextNode('покупка'));
    let th4 = document.createElement('th');
    th4.appendChild(document.createTextNode('продажа'));
    let th5 = document.createElement('th');
    th5.appendChild(document.createTextNode('заявка активна до'));
    let th6 = document.createElement('th');

    let th7 = document.createElement('th');
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    tr.appendChild(th6);
    tr.appendChild(th7);
    table.appendChild(tr);
    if (data && data.length > 0) {
        data.forEach(function (element) {

            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.className = 'maxWidth';
            td1.innerHTML = `${element.symbol.showName}<br><strong>${element.symbol.ticker}</strong>`;
            let td2 = document.createElement('td');
            td2.appendChild(document.createTextNode(element.prices.last.value + element.prices.last.currency));
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            //td3.innerHTML = element.prices.buy.value + element.prices.buy.currency + '<br>' + '<input class="tickerPrice buy" type="number" >';
            td3.innerHTML = `<input class="tickerPrice buy" id="buy_price_${element.symbol.ticker}" type="number" placeholder="купить  <=" title="Введите цену, при достижении которой в браузер будет выдано уведомление&#013;Будет сравниваться с ценой покупки">`;
            td3.className = 'tickerCol';
            let td4 = document.createElement('td');
            //td4.innerHTML = element.prices.sell.value + element.prices.sell.currency + '<br>' + '<input class="tickerPrice sell" type="number">';
            td4.innerHTML = `<input class="tickerPrice sell" id="sell_price_${element.symbol.ticker}" type="number" placeholder="продать >="  title="Введите цену, при достижении которой в браузер будет выдано уведомление&#013;Будет сравниваться с ценой продажи">`;
            td4.className = 'tickerCol';
            let td5 = document.createElement('td');
            td5.className = 'tickerCol';
            td5.innerHTML = `<input type="datetime-local" id="datetime_${element.symbol.ticker}" title="Если не установлено, то бессрочно. Не забудьте добавить время">`;
            let td6 = document.createElement('td');
            //td6.width = '50';
            td6.innerHTML = `<input type="checkbox" id="mobile_alert_${element.symbol.ticker}" title="При достижении цены оповещение также сработает на телефоне в приложении Брокера&#013;Уведомления на телефоне бессрочные и срабатывают только по last price"><label class="icon" for="mobile_alert_${element.symbol.ticker}">📳</label>`;
            let td7 = document.createElement('td');
            td7.className = 'tickerCol';
            td7.innerHTML = `<input type="button" class="addTicker" data-showname="${element.symbol.showName}" data-ticker="${element.symbol.ticker}" value="Добавить">`;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td5);
            tr.appendChild(td6);
            tr.appendChild(td7);
            table.appendChild(tr);
        })
    }
    document.getElementById('table').innerText = '';
    document.getElementById('table').appendChild(table);
    setAddButtonHandler();
}

// список для добавления онлайн заявок
function create_orders_table(data) {
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
    th5.appendChild(document.createTextNode('кол-во лотов'));
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
            td1.className = 'maxWidth';
            td1.innerHTML = `${element.symbol.showName}<br><strong>${element.symbol.ticker}</strong>`;
            let td2 = document.createElement('td');
            td2.appendChild(document.createTextNode(element.prices.last.value + element.prices.last.currency));
            td2.className = 'tickerCol';
            let td3 = document.createElement('td');
            //td3.innerHTML = element.prices.buy.value + element.prices.buy.currency + '<br>' + '<input class="tickerPrice buy" type="number" >';
            td3.innerHTML = '<input class="tickerOrderBuyPrice buy" type="number" placeholder="продать >=">';
            td3.className = 'tickerCol';
            let td4 = document.createElement('td');
            //td4.innerHTML = element.prices.sell.value + element.prices.sell.currency + '<br>' + '<input class="tickerPrice sell" type="number">';
            td4.innerHTML = '<input class="tickerOrderSellPrice sell" type="number" placeholder="купить  <=">';
            td4.className = 'tickerCol';
            let td5 = document.createElement('td');
            td5.className = 'tickerCol';
            td5.innerHTML = `<input type="button" class="addTicker" data-showname="${element.symbol.showName}" data-ticker="${element.symbol.ticker}" value="Добавить">`;
            let td6 = document.createElement('td');
            td6.className = 'tickerCol';
            td6.innerHTML = '<input class="tickerQuantity" type="number" title="">';
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td6);
            tr.appendChild(td5);
            table.appendChild(tr);
        })
    }
    document.getElementById('order_table').innerText = '';
    document.getElementById('order_table').appendChild(table);
    setChangeOrderHandler();
}

// рендер таблицы с акциями ранее сохраненные
function create_alert_table(data_list) {
    chrome.storage.sync.get([TICKER_LIST], function (data) {
        let table;

        if (data[TICKER_LIST] && data[TICKER_LIST].length > 0) {
            table = document.createElement('table');
            table.className = 'alertPriceTable';
            let tr = document.createElement('tr');
            let th1 = document.createElement('th');
            //th1.appendChild(document.createTextNode('название'));
            let th2 = document.createElement('th');
            th2.width = '100px';
            th2.innerHTML = 'цены брокера';
            let th3 = document.createElement('th');
            th3.appendChild(document.createTextNode('измн. за день'));
            let th4 = document.createElement('th');
            th4.appendChild(document.createTextNode('продажа по'));
            let th5 = document.createElement('th');
            th5.appendChild(document.createTextNode('покупка по'));
            let th6 = document.createElement('th');
            th6.appendChild(document.createTextNode('заявка активна до'));
            let th7 = document.createElement('th');
            th7.appendChild(document.createTextNode('осталось до цели'));
            tr.appendChild(th1);
            tr.appendChild(th2);
            tr.appendChild(th3);
            tr.appendChild(th4);
            tr.appendChild(th5);
            tr.appendChild(th6);
            tr.appendChild(th7);
            table.appendChild(tr);
            let list_for_iteration = data_list || data[TICKER_LIST];
            chrome.storage.sync.get([OPTION_SORT_BY_NEAREST], function (result) {
                if (result[OPTION_SORT_BY_NEAREST] === true) list_for_iteration = list_for_iteration.sort(sortAlertRow);
                list_for_iteration.forEach(function (element) {
                    let opacity_rate = giveLessDiffToTarget(element);
                    // обнуляем онлайн цены полученные из Storage, если нет списка с ценами для рендера (раньше они хранились и обновлялись там)
                    if (!data_list) {
                        element.online_average_price = 'Обновление';
                        element.online_buy_price = '';
                        element.currency = '';
                        element.online_sell_price = '';
                        element.earnings = undefined;
                    } else element.online_buy_price = element.online_buy_price || element.online_average_price; // для внебиржевых нет цены покупки и продажи
                    let tr = document.createElement('tr');
                    if (element.orderId) {
                        if (element.sell_price) tr.className = 'isOnlineOrderSell';
                        if (element.buy_price) tr.className = 'isOnlineOrderBuy';
                    }
                    let td1 = document.createElement('td');
                    td1.className = 'maxWidth';
                    td1.innerHTML = `${element.showName}<br>` +
                        (element.subscriptId ? `<span class="icon" title="Уведомление было добавлено на мобильном по цене ${element.subscriptPrice}">📳</span>` : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') +
                        (element.isFavorite ? `<span class="icon" title="Было добавлено в избранное в мобильном приложение">⭐</span>` : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;') +
                        `<strong>${element.ticker}</strong>`;

                    let td2 = document.createElement('td');
                    td2.innerHTML =
                        `<div style="float:left;margin-top: 5px" data-ticker="${element.ticker}" class="onlineAverage" title="Последняя цена">${element.online_average_price.toLocaleString('ru-RU', {
                            style: 'currency',
                            currency: element.currency,
                            minimumFractionDigits: element.online_average_price < 0.1 ? 4 : 2
                        })}</div>
                    <div style="float:right;">
                    <div data-ticker="${element.ticker}" class="onlineBuy"  title="Цена покупки">
                    <a class="onlineBuy" href="${BUY_LINK}${element.ticker}" target="_blank" title="Купить">${element.online_buy_price}</a>
                    </div>
                    <div data-ticker="${element.ticker}" class="onlineSell"  title="Цена продажи">
                    <a class="onlineSell" href="${SELL_LINK}${element.ticker}" target="_blank" title="Продать">${element.online_sell_price}</a>
                    </div>
                    </div>`;
                    let td3 = document.createElement('td');
                    td3.innerHTML = element.earnings ? `<div data-daysum-ticker="${element.ticker}">${element.earnings.absolute.value.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: element.earnings.absolute.currency,
                        minimumFractionDigits: Math.abs(element.earnings.absolute.value) < 0.1 ? 4 : 2
                    })}</div>
                    <div data-daypercent-ticker="${element.ticker}"><strong>${element.earnings.relative.toLocaleString('ru-RU', {
                        style: 'percent',
                        maximumSignificantDigits: 2
                    })}</strong></div>` : '';
                    td3.className = element.earnings ? element.earnings.absolute.value / 1 < 0 ? 'onlineSell' : 'onlineBuy' : '';
                    td3.align = 'right';
                    let td4 = document.createElement('td');
                    td4.innerHTML = `<strong title="Цена при достижении которой будет выведено уведомление с предложением продать">${element.sell_price}</strong>`;
                    td4.className = 'onlineSell';
                    td4.align = 'right';
                    if (element.orderId) {
                        td4.className = '';
                        td4.align = 'center';
                        td4.colSpan = '2';
                        td4.innerHTML = `<strong title="Заявка на ${element.sell_price ? 'продажу' : 'покупку'} ${element.ticker} по цене ${element.sell_price || element.buy_price} в количестве ${element.quantity}">${element.sell_price || element.buy_price}, ${element.quantity} шт</strong>`;
                    }
                    let td5 = document.createElement('td');
                    td5.innerHTML = `<strong title="Цена при достижении которой будет выведено уведомление с предложением купить">${element.buy_price}</strong>`;
                    td5.className = 'onlineBuy';
                    td5.align = 'right';
                    let td6 = document.createElement('td');
                    td6.className = '';
                    let alert_date = new Date(Date.parse(element.best_before));
                    if (element.orderId) {
                        td6.innerHTML = '<span title="заявка устанавливается до конца торгового дня, потом автоматически снимается">' + msToTime(element.timeToExpire) + '</span>';
                    } else td6.innerHTML = (element.best_before ? alert_date.toLocaleDateString() + ' ' + alert_date.toLocaleTimeString() : 'бессрочно');
                    td6.align = 'center';
                    let td7 = document.createElement('td');
                    td7.innerHTML = `<strong>${opacity_rate.toLocaleString('ru-RU', {
                        style: 'percent',
                        maximumSignificantDigits: 2
                    })}</strong>`;
                    td7.className = '';
                    td7.align = 'center';
                    let td8 = document.createElement('td');
                    // hash for delete = ticker+sellprice+buyprice
                    if (element.orderId && element.status === 'New' || !element.orderId)
                        td8.innerHTML = `<input class="deleteTicker" data-index="${element.orderId || (element.ticker + (element.sell_price || '0') + (element.buy_price || '0'))}" type="button" value="X" title="${element.orderId ? 'Снять заявку' : 'Удалить'}">`;
                    else td8.innerHTML = 'В процессе';
                    tr.appendChild(td1);
                    tr.appendChild(td2);
                    tr.appendChild(td3);
                    tr.appendChild(td4);
                    if (!element.orderId) tr.appendChild(td5);
                    tr.appendChild(td6);
                    tr.appendChild(td7);
                    tr.appendChild(td8);
                    tr.style.opacity = 1 - ((opacity_rate > 0.5) ? 0.5 : opacity_rate);

                    table.appendChild(tr);
                    //setRefreshHandler();
                });
                document.getElementById('alert_table').innerText = '';
                document.getElementById('alert_table').appendChild(table);
                setDeleteButtonHandler()
            })
        } else {
            table = document.createElement('h5');
            table.innerText = 'Список для отслеживания пуст, добавьте, нажав "Добавить для отслеживания"';
            document.getElementById('alert_table').innerText = '';
            document.getElementById('alert_table').appendChild(table);
        }

    })
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
    document.getElementById('orders_table').style.display = 'none';
    document.getElementById('alert_table').style.display = 'block';
    document.getElementById('sort_by_nearest').style.display = 'inline';
    document.getElementById('label_sort_by_nearest').style.display = 'inline';
});
document.getElementById('add_alert_list').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('orders_table').style.display = 'none';
    document.getElementById('sort_by_nearest').style.display = 'none';
    document.getElementById('label_sort_by_nearest').style.display = 'none';
    document.getElementById('price_table').style.display = 'block';
});
document.getElementById('add_orders').addEventListener('change', function (e) {
    document.getElementById('alert_table').style.display = 'none';
    document.getElementById('sort_by_nearest').style.display = 'none';
    document.getElementById('label_sort_by_nearest').style.display = 'none';
    document.getElementById('price_table').style.display = 'none';
    document.getElementById('orders_table').style.display = 'block';
});

// подгрузка списка акций по названию
document.getElementById('symbol_name').addEventListener('input', function (e) {
    if (e.target.value) {
        throttle(port.postMessage({method: "getListStock", params: e.target.value}), 500);
    }
});

// подгрузка списка акций по названию для онлайн заявок
document.getElementById('order_symbol_name').addEventListener('input', function (e) {
    if (e.target.value) {
        throttle(port.postMessage({method: "getListStockForOrder", params: e.target.value}), 500);
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
    });
    chrome.storage.local.set({[ALERT_TICKER_LIST]: {}}, () => {
        console.log('reset relative ');
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
    });
    chrome.storage.local.set({[ALERT_TICKER_LIST]: {}}, () => {
        console.log('reset relative ');
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALERT_TODAY_VALUE_PER_SYMBOL], function (result) {
    console.log('get Alert_today_value_per_symbol option');
    document.getElementById(OPTION_ALERT_TODAY_VALUE_PER_SYMBOL).value = result[OPTION_ALERT_TODAY_VALUE_PER_SYMBOL] || 5;
});


// сохраняем применение Конвертировать в рубли
document.getElementById(OPTION_CONVERT_TO_RUB).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_CONVERT_TO_RUB]: e.target.checked}, function () {
        console.log('convert_to_rub option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_CONVERT_TO_RUB], function (result) {
    console.log('get convert_to_rub option');
    document.getElementById(OPTION_CONVERT_TO_RUB).checked = result[OPTION_CONVERT_TO_RUB] === true;
});

// сохраняем применение Сортировки
document.getElementById(OPTION_SORT_BY_NEAREST).addEventListener('change', function (e) {
    chrome.storage.sync.set({[OPTION_SORT_BY_NEAREST]: e.target.checked}, function () {
        console.log('sort_bt_nearest option set to ' + e.target.checked);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_SORT_BY_NEAREST], function (result) {
    console.log('get sort_by_nearest option');
    document.getElementById(OPTION_SORT_BY_NEAREST).checked = result[OPTION_SORT_BY_NEAREST] === true;
});

// сохраняем применение Использовать Alpantage
document.getElementById(OPTION_ALPHAVANTAGE).addEventListener('change', function (e) {
    if (e.target.checked && !document.getElementById(OPTION_ALPHAVANTAGE_KEY).value) {
        alert('Сначала укажите ключ полученный с сайта Alphavantage');
        e.target.checked=false;
    } else
        chrome.storage.sync.set({[OPTION_ALPHAVANTAGE]: e.target.checked}, function () {
            console.log('alphavantage option set to ' + e.target.checked);
        })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALPHAVANTAGE], function (result) {
    console.log('get alphavantage option');
    document.getElementById(OPTION_ALPHAVANTAGE).checked = result[OPTION_ALPHAVANTAGE] === true;
});

// сохраняем применение  Alpantage key
document.getElementById(OPTION_ALPHAVANTAGE_KEY).addEventListener('input', function (e) {
    chrome.storage.sync.set({[OPTION_ALPHAVANTAGE_KEY]: e.target.value}, function () {
        console.log('alphavantage key option set to ' + e.target.value);
    })
});
// подгружаем настройки
chrome.storage.sync.get([OPTION_ALPHAVANTAGE_KEY], function (result) {
    console.log('get alphavantage key option');
    document.getElementById(OPTION_ALPHAVANTAGE_KEY).value = result[OPTION_ALPHAVANTAGE_KEY] || '';
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

//create_alert_table();

port.postMessage({method: "getSession"});
port.postMessage({method: "updateAlertPrices"});
port.postMessage({method: "getPortfolio"});
port.postMessage({method: "updateHeader"});
port.postMessage({method: "getUserInfo"});
port.postMessage({method: "getAvailableCashTCS"});
port.postMessage({method: "getAvailableCashBCS"});
port.postMessage({method: "getAvailableCashIIS"});
port.postMessage({method: "getVersionAPI"});


// запускаем фоновый пинг сервера + в нем все проверки
chrome.alarms.create("updatePortfolio", {
    delayInMinutes: INTERVAL_TO_CHECK,
    periodInMinutes: INTERVAL_TO_CHECK
});
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "updatePortfolio") {
        port.postMessage({method: "updateAlertPrices"});
        port.postMessage({method: "getPortfolio"});
        port.postMessage({method: "updateHeader"});
        port.postMessage({method: "getAvailableCashTCS"});
        port.postMessage({method: "getAvailableCashBCS"});
        port.postMessage({method: "getAvailableCashIIS"});
    }
});

// вызывается при изменении storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {

        // перерисовываем таблицу с уведомлениями при изменении Storage
        if (key === TICKER_LIST) debounce(create_alert_table(), 1000);

    }
});


