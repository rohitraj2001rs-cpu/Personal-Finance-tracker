package com.financeflow.app

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Telephony
import android.widget.*
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.regex.Pattern

class MainActivity : Activity() {
    private val client = OkHttpClient()
    private val apiUrl = "http://10.0.2.2:5000/api/transactions"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 32)
        }

        val title = TextView(this).apply {
            text = "FinanceFlow SMS Parser"
            textSize = 26f
        }
        val status = TextView(this).apply {
            text = "Reads supported transaction SMS messages and previews detected amounts."
            textSize = 16f
        }
        val button = Button(this).apply {
            text = "Scan transaction SMS"
        }

        layout.addView(title)
        layout.addView(status)
        layout.addView(button)
        setContentView(layout)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.READ_SMS), 42)
        }

        button.setOnClickListener {
            val result = findLatestTransactionSms()
            if (result == null) {
                status.text = "No supported transaction SMS found."
                return@setOnClickListener
            }

            status.text = "Detected: ${result.amount} ${result.type} (${result.category})"

            // In a production app, authenticate the user first and ask for explicit confirmation.
            // This demo sends only after the user presses the confirmation dialog.
            AlertDialogHelper.confirm(this, "Import transaction?",
                "${result.type}: ₹${result.amount}\nCategory: ${result.category}") {
                upload(result, status)
            }
        }
    }

    private fun findLatestTransactionSms(): ParsedTransaction? {
        val uri = Telephony.Sms.Inbox.CONTENT_URI
        val projection = arrayOf(Telephony.Sms.BODY, Telephony.Sms.DATE)
        contentResolver.query(uri, projection, null, null, "${Telephony.Sms.DATE} DESC")?.use { cursor ->
            val bodyIndex = cursor.getColumnIndex(Telephony.Sms.BODY)
            while (cursor.moveToNext()) {
                val body = cursor.getString(bodyIndex) ?: continue
                parseSms(body)?.let { return it }
            }
        }
        return null
    }

    private fun parseSms(body: String): ParsedTransaction? {
        val lower = body.lowercase()
        val expense = lower.contains("debited") || lower.contains("spent") ||
                lower.contains("purchase") || lower.contains("paid")
        val income = lower.contains("credited") || lower.contains("received")

        if (!expense && !income) return null

        val pattern = Pattern.compile("(?:rs\\.?|inr|₹)\\s*([0-9,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(body)
        if (!matcher.find()) return null

        val amount = matcher.group(1).replace(",", "").toDoubleOrNull() ?: return null
        val category = when {
            lower.contains("swiggy") || lower.contains("zomato") || lower.contains("restaurant") -> "Food"
            lower.contains("uber") || lower.contains("ola") || lower.contains("metro") -> "Transport"
            lower.contains("amazon") || lower.contains("flipkart") -> "Shopping"
            lower.contains("salary") -> "Salary"
            else -> "Other"
        }

        return ParsedTransaction(
            amount = amount,
            type = if (income) "income" else "expense",
            category = category,
            description = "Imported from SMS"
        )
    }

    private fun upload(tx: ParsedTransaction, status: TextView) {
        Thread {
            try {
                val json = JSONObject().apply {
                    put("type", tx.type)
                    put("amount", tx.amount)
                    put("category", tx.category)
                    put("description", tx.description)
                    put("source", "android-sms")
                }

                val body = json.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder().url(apiUrl).post(body).setHeader("Authorization", "Bearer YOUR_TOKEN").build()
                client.newCall(request).execute().use { response ->
                    runOnUiThread {
                        status.text = if (response.isSuccessful)
                            "Transaction imported successfully."
                        else
                            "API returned ${response.code}. Configure a real login token before use."
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { status.text = "Upload failed: ${e.message}" }
            }
        }.start()
    }

    data class ParsedTransaction(
        val amount: Double,
        val type: String,
        val category: String,
        val description: String
    )
}
