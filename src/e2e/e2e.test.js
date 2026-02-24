/**
 * @jest-environment node
 */

import puppeteer from 'puppeteer';

describe('Trip Calendar e2e testing', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true, // Для GitHub Actions
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    test('should toggle return input based on checkbox', async () => {
        await page.goto('http://localhost:8080');
        await page.waitForSelector('.booking-container');

        // По умолчанию чекбокс включен, инпут "Обратно" должен быть активен
        let isDisabled = await page.$eval('#return-input', el => el.disabled);
        expect(isDisabled).toBe(false);

        const checkbox = await page.$('#round-trip-checkbox');
        await checkbox.click();


        isDisabled = await page.$eval('#return-input', el => el.disabled);
        expect(isDisabled).toBe(true);
    });

    test('should open calendar widget on input click', async () => {
        await page.goto('http://localhost:8080');
        await page.waitForSelector('.booking-container');

        // Кликаем на инпут "Туда"
        const departInput = await page.$('#depart-input');
        await departInput.click();

        // Проверяем, что календарь показался на экране (удалился класс hidden)
        const calendarVisible = await page.$eval('#calendar-widget', el => !el.classList.contains('hidden'));
        expect(calendarVisible).toBe(true);
    });
});