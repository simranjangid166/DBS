package com.library.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EmbeddingService {
    private final ObjectMapper mapper = new ObjectMapper();
    private final String url, model, apiKey;

    public EmbeddingService(@Value("${app.embedding.url}") String url,
                            @Value("${app.embedding.model}") String model,
                            @Value("${app.embedding.api-key}") String apiKey) {
        this.url = url; this.model = model; this.apiKey = apiKey;
    }

    public String embed(String text) {
        // If no embedding API key is supplied, use a small deterministic
        // local vector so the complete Postman/MySQL workflow remains testable.
        if (apiKey == null || apiKey.isBlank()) return localVector(text);

        try {
            String body = mapper.writeValueAsString(Map.of("model", model, "input", text));
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() / 100 != 2)
                throw new IllegalStateException("Embedding API failed: " + response.body());

            JsonNode arr = mapper.readTree(response.body()).path("data").get(0).path("embedding");
            List<Double> values = new ArrayList<>();
            for (JsonNode n : arr) values.add(n.asDouble());
            return mapper.writeValueAsString(values);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to create embedding", e);
        }
    }

    private String localVector(String text) {
        double[] v = new double[64];
        String normalized = text.toLowerCase(Locale.ROOT);
        for (String token : normalized.split("\\W+")) {
            if (!token.isBlank()) {
                int index = Math.floorMod(token.hashCode(), v.length);
                v[index] += 1.0;
            }
        }
        double norm = Math.sqrt(Arrays.stream(v).map(x -> x*x).sum());
        if (norm > 0) for (int i = 0; i < v.length; i++) v[i] /= norm;
        try { return mapper.writeValueAsString(Arrays.stream(v).boxed().collect(Collectors.toList())); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }

    public double cosineSimilarity(String a, String b) {
        try {
            JsonNode x = mapper.readTree(a), y = mapper.readTree(b);
            int n = Math.min(x.size(), y.size());
            double dot = 0, nx = 0, ny = 0;
            for (int i=0; i<n; i++) {
                double xv=x.get(i).asDouble(), yv=y.get(i).asDouble();
                dot += xv*yv; nx += xv*xv; ny += yv*yv;
            }
            return (nx == 0 || ny == 0) ? 0 : dot/(Math.sqrt(nx)*Math.sqrt(ny));
        } catch (Exception e) {
            return 0;
        }
    }
}
