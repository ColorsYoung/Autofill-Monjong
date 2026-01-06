const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const path = require('path');

chromium.use(stealth());

const CONFIG = {
  TARGET_URL: 'https://wildlifesanctuaryfca16.com/omkoi/reservation',
  IMAGE_PATH: path.join(__dirname, 'id_card.jpg'),

  TARGET_MONTH: 1,
  TARGET_DATE: 13,

  // --- ตั้งค่าระบบวนลูป (เปิด/ปิด ตรงนี้) ---
  AUTO_RETRY: false, // true = วนลูปใหม่ถ้าวันเต็ม, false = รันรอบเดียวจบ

  PAYLOAD: {
    prefix: 'นาย',
    first_name: 'มนัสวี',
    last_name: 'เจริญราษฏร์',
    tel: '0957342645',
    nid: '1330453153454',
    birth_day: '2',
    birth_month: 'พฤษภาคม',
    birth_year: '2540',
    email: 'manasavee@example.com'
  }
};

async function SniperLoop() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let isComplete = false;

  while (!isComplete) {
    try {
      console.log(`🚀 เริ่มบอท (เป้าหมาย: วันที่ ${CONFIG.TARGET_DATE} เดือนที่ ${CONFIG.TARGET_MONTH})`);
      await page.goto(CONFIG.TARGET_URL, { waitUntil: 'domcontentloaded' });

      // --- สเต็ป 1-2: ผ่านหน้าเงื่อนไข ---
      await page.waitForSelector('input[type="checkbox"]');
      await page.evaluate(() => {
        const c1 = document.querySelector('input[type="checkbox"]');
        const b1 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ถัดไป'));
        if (c1) c1.click(); if (b1) b1.click();
      });

      await page.waitForSelector('label[for="flexCheckDefault2"]', { timeout: 5000 });
      await page.evaluate(() => {
        const c2 = document.querySelector('#flexCheckDefault2') || document.querySelector('label[for="flexCheckDefault2"]');
        const b2 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ถัดไป') && b.offsetHeight > 0);
        if (c2) c2.click(); if (b2) b2.click();
      });

      // --- สเต็ป 3: เลือกวันที่ (Turbo Speed Edition + Check Full) ---
      await page.waitForSelector('#flexCheckDefault3');
      await page.evaluate(() => { document.querySelector('#flexCheckDefault3').click(); });
      await page.waitForSelector('.react-calendar__viewContainer', { state: 'visible' });

      const step3Result = await page.evaluate(async (config) => {
        const currentMonth = new Date().getMonth() + 1;
        const diff = config.TARGET_MONTH - currentMonth;

        if (diff > 0) {
          const nextBtn = document.querySelector('.react-calendar__navigation__next-button');
          for (let i = 0; i < diff; i++) {
            nextBtn.click();
            await new Promise(r => setTimeout(r, 150));
          }
        } else if (diff < 0) {
          const prevBtn = document.querySelector('.react-calendar__navigation__prev-button');
          for (let i = 0; i < Math.abs(diff); i++) {
            prevBtn.click();
            await new Promise(r => setTimeout(r, 150));
          }
        }

        const days = Array.from(document.querySelectorAll('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)'));
        const target = days.find(d => d.innerText.trim() === String(config.TARGET_DATE));

        if (target) {
          target.click();
          target.dispatchEvent(new Event('change', { bubbles: true }));

          // เช็คทันทีว่าปุ่มถัดไปกดได้ไหม
          await new Promise(r => setTimeout(r, 200));
          const nextBtn3 = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('ถัดไป') && b.offsetHeight > 0);

          if (nextBtn3 && !nextBtn3.disabled) {
            nextBtn3.click();
            return "SUCCESS";
          }
        }
        return "FULL";
      }, { TARGET_MONTH: CONFIG.TARGET_MONTH, TARGET_DATE: CONFIG.TARGET_DATE });

      // ตรวจสอบผลลัพธ์สเต็ป 3
      if (step3Result === "FULL") {
        if (CONFIG.AUTO_RETRY) {
          console.log("❌ วันที่เลือกเต็มแล้ว! กำลังรีเฟรชลองใหม่...");
          await page.waitForTimeout(500);
          continue;
        } else {
          console.log("❌ วันที่เลือกเต็มแล้ว (ปิดระบบวนลูปไว้) จอดรอตรงนี้ครับ...");
          return; // หยุดการทำงานของฟังก์ชัน SniperLoop ทันที หน้าจอจะค้างไว้ 100%
        }
      }

      // จัดการ Pop-up ยืนยัน
      try {
        const confirmPop = page.locator('button:has-text("ยอมรับ"), button:has-text("ตกลง")').last();
        await confirmPop.waitFor({ state: 'visible', timeout: 800 });
        await page.evaluate((el) => el.click(), await confirmPop.elementHandle());
      } catch (e) { }

      // --- สเต็ป 4: ข้อมูลส่วนตัว (โค้ดเดิมของคุณ) ---
      console.log("⚡️ กรอกข้อมูลส่วนตัว...");
      await page.waitForSelector('input[id="ชื่อ"]', { state: 'attached', timeout: 10000 });

      const prefixBox = page.locator('div.border-2.cursor-pointer').first();
      await page.evaluate((el) => el.click(), await prefixBox.elementHandle());
      await page.waitForTimeout(250);
      const prefixOption = page.locator(`div:text-is("${CONFIG.PAYLOAD.prefix}")`).last();
      await page.evaluate((el) => el.click(), await prefixOption.elementHandle());

      await page.fill('input[id="ชื่อ"]', CONFIG.PAYLOAD.first_name);
      await page.fill('input[id="นามสกุล"]', CONFIG.PAYLOAD.last_name);
      await page.fill('input[id="เลขบัตรประชาชน"]', CONFIG.PAYLOAD.nid);
      await page.fill('input[id="เบอร์โทรศัพท์"]', CONFIG.PAYLOAD.tel);

      // 📅 ปฏิทินวันเกิด (โค้ดเดิมของคุณ)
      const birthInput = page.locator('div:has-text("วันเกิด (ปี พ.ศ.)") + div').first();
      await page.evaluate((el) => el.click(), await birthInput.elementHandle());
      const activeCalendar = page.locator('.react-calendar:visible');
      const navLabel = activeCalendar.locator('.react-calendar__navigation__label');
      await page.evaluate((el) => el.click(), await navLabel.elementHandle());
      await page.waitForTimeout(400);
      await page.evaluate((el) => el.click(), await navLabel.elementHandle());
      await page.waitForTimeout(500);

      let yearFound = false;
      for (let i = 0; i < 50; i++) {
        const yearButtons = activeCalendar.locator('.react-calendar__decade-view__years__year');
        const yearsOnScreen = await yearButtons.allInnerTexts();
        const foundIndex = yearsOnScreen.findIndex(y => y.includes(CONFIG.PAYLOAD.birth_year));
        if (foundIndex !== -1) {
          await page.evaluate((el) => el.click(), await yearButtons.nth(foundIndex).elementHandle());
          yearFound = true;
          break;
        } else {
          const prevBtn = activeCalendar.locator('.react-calendar__navigation__prev-button');
          await page.evaluate((el) => el.click(), await prevBtn.elementHandle());
          await page.waitForTimeout(150);
        }
      }

      if (yearFound) {
        const monthTarget = CONFIG.PAYLOAD.birth_month.substring(0, 3);
        const monthBtn = activeCalendar.locator('.react-calendar__year-view__months__month').filter({ hasText: new RegExp(monthTarget) }).first();
        await page.waitForSelector('.react-calendar__year-view__months__month', { state: 'visible' });
        await page.evaluate((el) => el.click(), await monthBtn.elementHandle());
        await page.waitForTimeout(250);
        const dayBtn = activeCalendar.locator('.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)').filter({ hasText: new RegExp(`^${CONFIG.PAYLOAD.birth_day}$`) }).first();
        await page.evaluate((el) => el.click(), await dayBtn.elementHandle());
      }

      await page.setInputFiles('input[type="file"]', CONFIG.IMAGE_PATH);
      await page.waitForTimeout(600);
      await page.locator('button:has-text("ตรวจสอบ")').click();

      for (let i = 1; i <= 2; i++) {
        const btn = page.locator('button:has-text("ถัดไป"):visible').last();
        await btn.waitFor({ state: 'visible' });
        await page.evaluate((el) => el.click(), await btn.elementHandle());
        await page.waitForTimeout(1000);
      }

      // --- หน้าสุดท้าย ---
      await page.fill('input[placeholder="กรอกอีเมล"]', CONFIG.PAYLOAD.email);
      const conditionCheck = page.locator('#flexCheckDefault6');
      await page.evaluate((el) => { if (el && !el.checked) el.click(); }, await conditionCheck.elementHandle());
      await page.evaluate(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }); });

      console.log("✅ จบภารกิจ! แก้ CAPTCHA แล้วกดยืนยันเลย!");
      isComplete = true; // ออกจากลูป

    } catch (e) {
      console.error("❌ เกิดข้อผิดพลาด:", e.message);
      if (CONFIG.AUTO_RETRY) {
        console.log("🔄 กำลังพยายามเริ่มใหม่...");
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }
  }
}

SniperLoop();