package xyz.antiz.urlShorter.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BrowserAssetController {

    @RequestMapping(
            method = {RequestMethod.GET, RequestMethod.HEAD},
            path = {
                    "/favicon.ico",
                    "/favicon-16x16.png",
                    "/favicon-32x32.png",
                    "/apple-touch-icon.png",
                    "/android-chrome-192x192.png",
                    "/android-chrome-512x512.png"
            }
    )
    public ResponseEntity<Void> browserAssetProbe() {
        return ResponseEntity.noContent().build();
    }
}
