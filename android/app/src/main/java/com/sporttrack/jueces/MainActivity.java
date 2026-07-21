package com.sporttrack.jueces;

import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean keyboardFixApplied = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Asegura que la Activity acepte el teclado soft
        getWindow().setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        );
        super.onCreate(savedInstanceState);
        handler.postDelayed(this::setupWebViewKeyboardFix, 350);
    }

    @Override
    public void onResume() {
        super.onResume();
        handler.postDelayed(this::setupWebViewKeyboardFix, 200);
    }

    private void setupWebViewKeyboardFix() {
        try {
            if (getBridge() == null) return;
            final WebView webView = getBridge().getWebView();
            if (webView == null) return;

            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus(View.FOCUS_DOWN);

            if (keyboardFixApplied) return;
            keyboardFixApplied = true;

            // Cualquier toque en el WebView: pedir IME (el foco del <input> a veces no lo abre)
            webView.setOnTouchListener((v, event) -> {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                    case MotionEvent.ACTION_UP:
                        v.requestFocus();
                        forceShowKeyboard(v);
                        break;
                    default:
                        break;
                }
                return false; // no consumir: el WebView sigue recibiendo el tap
            });
        } catch (Exception ignored) {
            // Bridge aún no listo
        }
    }

    private void forceShowKeyboard(View view) {
        try {
            InputMethodManager imm =
                (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm == null) return;

            imm.restartInput(view);
            boolean shown = imm.showSoftInput(view, InputMethodManager.SHOW_IMPLICIT);
            if (!shown) {
                handler.postDelayed(
                    () -> imm.showSoftInput(view, InputMethodManager.SHOW_FORCED),
                    80
                );
            }
        } catch (Exception ignored) {
        }
    }
}
