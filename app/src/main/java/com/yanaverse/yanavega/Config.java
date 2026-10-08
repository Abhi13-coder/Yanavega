package com.yanaverse.yanavega;

import android.content.Context;

/** Where game data is downloaded from (edit res/values/yanavega_config.xml). */
final class Config {
    private Config() {}

    static String contentBase(Context c) {
        return "https://raw.githubusercontent.com/" + c.getString(R.string.repo_owner) + "/"
                + c.getString(R.string.repo_name) + "/" + c.getString(R.string.repo_branch) + "/"
                + c.getString(R.string.content_dir) + "/";
    }

    static String manifestUrl(Context c) { return contentBase(c) + "manifest.json"; }

    static String releasesUrl(Context c) {
        return "https://github.com/" + c.getString(R.string.repo_owner) + "/" + c.getString(R.string.repo_name) + "/releases/latest";
    }

    static String contentHost(Context c) { return c.getString(R.string.content_host); }
}
