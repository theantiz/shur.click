package xyz.antiz.urlShorter.util;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class IstDateTime {

    public static final ZoneId ZONE_ID = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter OFFSET_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private IstDateTime() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE_ID);
    }

    public static String format(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZONE_ID).format(OFFSET_FORMATTER);
    }
}
