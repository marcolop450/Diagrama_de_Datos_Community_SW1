package com.sw1.casetool;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;

public class DatabaseConnectionTest {

    @Test
    public void testConnections() {
        String password = "Omegakakis54";

        String[] testUrls = {
            "jdbc:postgresql://aws-0-us-east-2.pooler.supabase.com:5432/postgres?user=postgres.ttopqwgoilgqkphwptjf&password=" + password + "&sslmode=require",
            "jdbc:postgresql://aws-0-us-east-2.pooler.supabase.com:6543/postgres?user=postgres.ttopqwgoilgqkphwptjf&password=" + password + "&sslmode=require",
            "jdbc:postgresql://db.ttopqwgoilgqkphwptjf.supabase.co:5432/postgres?user=postgres&password=" + password + "&sslmode=require"
        };

        for (String url : testUrls) {
            System.out.println("Trying URL: " + url.replaceAll("password=[^&]*", "password=***"));
            try (Connection conn = DriverManager.getConnection(url)) {
                System.out.println(">>> SUCCESS CONNECTING TO: " + url.replaceAll("password=[^&]*", "password=***"));
                try (ResultSet rs = conn.createStatement().executeQuery("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")) {
                    while (rs.next()) {
                        System.out.println("  Table: " + rs.getString(1));
                    }
                }
                return;
            } catch (Exception e) {
                System.out.println("  Failed: " + e.getMessage());
            }
        }
    }
}
