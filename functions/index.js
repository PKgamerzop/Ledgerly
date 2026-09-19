/**
 * Firebase Cloud Functions for Ledgerly
 * Automated Monthly Excel Spending Report
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// Configure Nodemailer transporter using environment variables
// Set these with: firebase functions:secrets:set EMAIL_USER="your-email@gmail.com" EMAIL_PASS="app-password"
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "reports@ledgerly.app",
    pass: process.env.EMAIL_PASS || "your-app-password",
  },
});

/**
 * Scheduled function to run on the last day of every month at 23:50 UTC.
 * Cron expression: "50 23 28-31 * *" checks if tomorrow is the first day of next month.
 */
exports.sendMonthlySpendingReport = onSchedule(
  {
    schedule: "50 23 28-31 * *",
    timeZone: "UTC",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Only proceed if tomorrow's month is different (meaning today is the actual last day of the month)
    if (tomorrow.getMonth() === today.getMonth()) {
      logger.info("Today is not the last day of the month. Skipping run.");
      return;
    }

    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const monthPrefix = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;
    const monthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });

    logger.info(`Starting Monthly Spending Report generation for ${monthName} (${monthPrefix}).`);

    try {
      // Fetch all registered users in Firebase Auth
      const listUsersResult = await admin.auth().listUsers(1000);
      const users = listUsersResult.users;

      logger.info(`Found ${users.length} users to process.`);

      for (const userRecord of users) {
        if (!userRecord.email) {
          logger.info(`User ${userRecord.uid} has no email address. Skipping.`);
          continue;
        }

        try {
          // Query user's transactions for this month from Firestore
          const transactionsSnapshot = await db
            .collection("users")
            .doc(userRecord.uid)
            .collection("transactions")
            .where("date", ">=", `${monthPrefix}-01`)
            .where("date", "<=", `${monthPrefix}-31`)
            .orderBy("date", "asc")
            .get();

          if (transactionsSnapshot.empty) {
            logger.info(`No transactions found for user ${userRecord.email} in ${monthPrefix}.`);
            continue;
          }

          // Build rows for Excel
          const rows = [];
          let totalMonthlySpend = 0;

          transactionsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const amount = Number(data.amount) || 0;
            totalMonthlySpend += amount;

            rows.push({
              Date: data.date,
              Reason: data.reason || "Unspecified",
              Amount: Number(amount.toFixed(2)),
            });
          });

          // Empty row
          rows.push({ Date: "", Reason: "", Amount: "" });

          // Final Row: Total Monthly Spend
          rows.push({
            Date: "Summary",
            Reason: "Total Monthly Spend",
            Amount: Number(totalMonthlySpend.toFixed(2)),
          });

          // Generate Excel Workbook buffer using xlsx
          const worksheet = XLSX.utils.json_to_sheet(rows);
          worksheet["!cols"] = [{ wch: 15 }, { wch: 40 }, { wch: 18 }];

          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Spend");
          const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

          // Send email with Excel attachment via Nodemailer
          const mailOptions = {
            from: `"Ledgerly" <${process.env.EMAIL_USER || "reports@ledgerly.app"}>`,
            to: userRecord.email,
            subject: `📊 Your Monthly Spending Report - ${monthName} | Ledgerly`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #0c3744; font-size: 24px; margin: 0;">LEDGERLY</h1>
                  <p style="color: #0d9488; font-size: 14px; margin: 4px 0 0 0;">Monthly Expense Statement</p>
                </div>
                <p>Hello,</p>
                <p>Attached is your automated spending report for <strong>${monthName}</strong>.</p>
                <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; padding: 16px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px; color: #115e59;">Total Monthly Spend:</p>
                  <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: bold; color: #0c3744;">$${totalMonthlySpend.toFixed(2)}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Transactions logged: ${transactionsSnapshot.size}</p>
                </div>
                <p style="font-size: 13px; color: #475569;">
                  The attached Excel spreadsheet (<code>.xlsx</code>) contains the itemized list of each date, description, and expense amount.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                  Ledgerly Progressive Web App • Manage spending and debts anywhere, anytime.
                </p>
              </div>
            `,
            attachments: [
              {
                filename: `Ledgerly_Spending_Report_${monthPrefix}.xlsx`,
                content: excelBuffer,
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              },
            ],
          };

          await transporter.sendMail(mailOptions);
          logger.info(`Successfully dispatched monthly Excel report to ${userRecord.email}`);
        } catch (userError) {
          logger.error(`Error processing user ${userRecord.email}:`, userError);
        }
      }

      logger.info(`Monthly report job completed for ${monthName}.`);
    } catch (error) {
      logger.error("Error executing monthly spending report job:", error);
    }
  }
);
