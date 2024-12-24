"use strict";
const express = require("express");
const axios = require("axios");
const compression = require("compression");

const app = express();
app.use(compression());

const PORT = 3000;

/**
 * inv.nadeko.net から動画情報を取得するメイン関数
 * @param {string} videoId - 動画ID
 * @returns {Promise<Object>} - 必要な動画情報を含むオブジェクト
 */
async function fetchFromInv(videoId) {
    const videoPageUrl = `https://inv.nadeko.net/watch?v=${videoId}`;
    const apiUrl = `https://just-frequent-network.glitch.me/api/${videoId}`;

    try {
        // 並列でリクエストを実行
        const [videoPageResponse, apiResponse] = await Promise.all([
            axios.get(videoPageUrl),
            axios.get(apiUrl),
        ]);

        const videoPageHtml = videoPageResponse.data;
        const apiData = apiResponse.data;

        // 動画URLを取得
        const videoUrlMatch = videoPageHtml.match(/<meta property="og:video" content="([^"]+)"\s*\/?>/);
        const videoUrl = videoUrlMatch ? videoUrlMatch[1] : null;

        // チャンネル名を取得
        const channelNameMatch = videoPageHtml.match(/<meta property="og:site_name" content="([^|]+)\s*\|\s*Invidious"\s*\/?>/);
        const channelName = channelNameMatch ? channelNameMatch[1].trim() : null;

        // タイトルを取得
        const titleMatch = videoPageHtml.match(/<meta property="og:title" content="([^"]+)"\s*\/?>/);
        const videoTitle = titleMatch ? titleMatch[1] : null;

        // チャンネル画像を取得
        const channelImageMatch = videoPageHtml.match(/<img src="\/ggpht\/([^"]+)" alt="" \/>/);
        const channelImageId = channelImageMatch ? channelImageMatch[1] : null;
        const channelImage = channelImageId ? `https://yt3.ggpht.com/${channelImageId}=s512-c-k-c0x00ffffff-no-rj` : null;

        // 概要欄を取得（APIから）
        const videoDes = apiData.videoDes || null;

        if (!videoUrl || !channelName || !videoTitle || !channelImage || !videoDes) {
            throw new Error("必要なデータの一部を取得できませんでした");
        }

        return {
            stream_url: videoUrl,
            videoId: videoId,
            channelId: apiData.channelId || null, // APIから取得
            channelName: channelName,
            channelImage: channelImage,
            videoTitle: videoTitle,
            videoDes: videoDes,
        };
    } catch (error) {
        console.error(`データ取得エラー (inv.nadeko.net): ${error.message}`);
        throw new Error("動画データの取得に失敗しました");
    }
}

/**
 * inv1.nadeko.net から動画情報を取得するメイン関数
 * @param {string} videoId - 動画ID
 * @returns {Promise<Object>} - 必要な動画情報を含むオブジェクト
 */
async function fetchFromInv1(videoId) {
    const videoPageUrl = `https://inv1.nadeko.net/watch?v=${videoId}`;

    try {
        const videoPageResponse = await axios.get(videoPageUrl);
        const videoPageHtml = videoPageResponse.data;

        // 動画URLを取得
        const videoUrlMatch = videoPageHtml.match(/<meta property="og:video" content="([^"]+)"\s*\/?>/);
        const videoUrl = videoUrlMatch ? videoUrlMatch[1] : null;

        // チャンネルIDを取得
        const channelIdMatch = videoPageHtml.match(/<a href="\/channel\/([^"]+)"/);
        const channelId = channelIdMatch ? channelIdMatch[1] : null;

        // チャンネル名を取得
        const channelNameMatch = videoPageHtml.match(/<meta property="og:site_name" content="([^|]+)\s*\|\s*Invidious"\s*\/?>/);
        const channelName = channelNameMatch ? channelNameMatch[1].trim() : null;

        // チャンネル画像を取得
        const channelImageMatch = videoPageHtml.match(/<img src="\/ggpht\/([^"]+)" alt="" \/>/);
        const channelImageId = channelImageMatch ? channelImageMatch[1] : null;
        const channelImage = channelImageId ? `https://yt3.ggpht.com/${channelImageId}=s512-c-k-c0x00ffffff-no-rj` : null;

        // タイトルを取得
        const titleMatch = videoPageHtml.match(/<meta property="og:title" content="([^"]+)"\s*\/?>/);
        const videoTitle = titleMatch ? titleMatch[1] : null;

        // 概要欄を取得
        const descriptionMatch = videoPageHtml.match(/<meta property="og:description" content="([^"]+)"\s*\/?>/);
        const videoDes = descriptionMatch ? descriptionMatch[1].replace(/\\n/g, '\n') : null; 

        if (!videoUrl || !channelId || !channelName || !channelImage || !videoTitle || !videoDes) {
            throw new Error("必要なデータの一部を取得できませんでした");
        }

        return {
            stream_url: videoUrl,
            videoId: videoId,
            channelId: channelId,
            channelName: channelName,
            channelImage: channelImage,
            videoTitle: videoTitle,
            videoDes: videoDes,
        };
    } catch (error) {
        console.error(`データ取得エラー (inv1.nadeko.net): ${error.message}`);
        throw new Error("動画データの取得に失敗しました");
    }
}

/**
 * /api/server/s1/:id エンドポイント
 * inv.nadeko.net に対応する動画データを取得してJSON形式で返す
 */
app.get("/api/server/s1/:id", async (req, res) => {
    const videoId = req.params.id;

    try {
        const videoData = await fetchFromInv(videoId);
        res.json(videoData);
    } catch (error) {
        res.status(500).json({
            error: "動画の取得に失敗しました (inv.nadeko.net)",
            details: error.message,
        });
    }
});

/**
 * /api/server/s2/:id エンドポイント
 * inv1.nadeko.net に対応する動画データを取得してJSON形式で返す
 */
app.get("/api/server/s2/:id", async (req, res) => {
    const videoId = req.params.id;

    try {
        const videoData = await fetchFromInv1(videoId);
        res.json(videoData);
    } catch (error) {
        res.status(500).json({
            error: "動画の取得に失敗しました (inv1.nadeko.net)",
            details: error.message,
        });
    }
});

// サーバースタート
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
