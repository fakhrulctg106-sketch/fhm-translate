package com.fhm.translate

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * High-Speed Native Translation Engine
 * Translates any screen text directly using Google Translate API without opening full app
 */
object TranslationHelper {

    suspend fun translate(
        text: String,
        targetLang: String = "bn",
        sourceLang: String = "auto"
    ): TranslationResult = withContext(Dispatchers.IO) {
        if (text.isBlank()) {
            return@withContext TranslationResult(
                originalText = "",
                translatedText = "",
                detectedSource = sourceLang,
                targetLang = targetLang,
                isSuccess = false,
                errorMessage = "Empty text"
            )
        }

        try {
            val encodedQuery = URLEncoder.encode(text, "UTF-8")
            val urlString = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=$sourceLang&tl=$targetLang&dt=t&q=$encodedQuery"
            val url = URL(urlString)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8000
                readTimeout = 8000
                setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14)")
            }

            val responseCode = conn.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream, "UTF-8"))
                val responseBuilder = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    responseBuilder.append(line)
                }
                reader.close()
                conn.disconnect()

                val rawJson = responseBuilder.toString()
                val jsonArray = JSONArray(rawJson)

                // The first element contains translated sentences array: [[["translated", "original", ...]]]
                val sentencesArray = jsonArray.optJSONArray(0)
                val translatedBuilder = StringBuilder()
                if (sentencesArray != null) {
                    for (i in 0 until sentencesArray.length()) {
                        val part = sentencesArray.optJSONArray(i)
                        if (part != null && part.length() > 0) {
                            translatedBuilder.append(part.optString(0))
                        }
                    }
                }

                // Detected source language is usually at index 2
                val detectedSource = jsonArray.optString(2, sourceLang)

                val resultText = translatedBuilder.toString().ifBlank { text }
                return@withContext TranslationResult(
                    originalText = text,
                    translatedText = resultText,
                    detectedSource = detectedSource,
                    targetLang = targetLang,
                    isSuccess = true
                )
            } else {
                conn.disconnect()
                return@withContext TranslationResult(
                    originalText = text,
                    translatedText = "[অনুবাদ করতে ব্যর্থ] $text",
                    detectedSource = sourceLang,
                    targetLang = targetLang,
                    isSuccess = false,
                    errorMessage = "HTTP $responseCode"
                )
            }
        } catch (e: Exception) {
            return@withContext TranslationResult(
                originalText = text,
                translatedText = "[অনুবাদ ত্রুটি] $text",
                detectedSource = sourceLang,
                targetLang = targetLang,
                isSuccess = false,
                errorMessage = e.message
            )
        }
    }
}

data class TranslationResult(
    val originalText: String,
    val translatedText: String,
    val detectedSource: String,
    val targetLang: String,
    val isSuccess: Boolean,
    val errorMessage: String? = null
)
