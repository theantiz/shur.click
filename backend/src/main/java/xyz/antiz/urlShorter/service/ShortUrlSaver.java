package xyz.antiz.urlShorter.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import xyz.antiz.urlShorter.entity.ShortUrl;
import xyz.antiz.urlShorter.repo.ShortUrlRepository;

@Component
public class ShortUrlSaver {

    private final ShortUrlRepository repo;

    public ShortUrlSaver(ShortUrlRepository repo) {
        this.repo = repo;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ShortUrl saveAndFlush(ShortUrl url) {
        return repo.saveAndFlush(url);
    }
}
