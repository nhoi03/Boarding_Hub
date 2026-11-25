package com.boardinghub.rental;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.jdbc.Sql;

/** Optional second run of the same tests against a dedicated, disposable MySQL test database. */
@EnabledIfEnvironmentVariable(named="RENTAL_MYSQL_TEST_URL",matches=".+")
@Sql(statements="SELECT 1",executionPhase=Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class RentalMySqlIntegrationTest extends RentalIntegrationTest {
    @DynamicPropertySource static void mysql(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",()->System.getenv("RENTAL_MYSQL_TEST_URL"));
        properties.add("spring.datasource.username",()->System.getenv("RENTAL_MYSQL_TEST_USER"));
        properties.add("spring.datasource.password",()->System.getenv("RENTAL_MYSQL_TEST_PASSWORD"));
        properties.add("spring.datasource.driver-class-name",()->"com.mysql.cj.jdbc.Driver");
        properties.add("spring.flyway.enabled",()->"true");
        properties.add("spring.flyway.locations",()->"classpath:db/mysql");
        properties.add("spring.jpa.hibernate.ddl-auto",()->"validate");
    }
}
