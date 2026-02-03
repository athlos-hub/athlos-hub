package br.com.athloshub.social_service.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.PriorityOrdered;

import javax.sql.DataSource;

@Configuration
public class DatabaseConfig {

    @Bean(name = "flyway", initMethod = "migrate")
    public Flyway flyway(DataSource dataSource) {
        System.out.println("======================================");
        System.out.println("🚀 Configurando Flyway...");
        System.out.println("======================================");
        
        Flyway flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .schemas("public")
            .baselineOnMigrate(true)
            .baselineVersion("0")
            .baselineDescription("Initial baseline")
            .validateOnMigrate(true)
            .cleanDisabled(true)
            .encoding("UTF-8")
            .placeholderReplacement(false)
            .load();
        
        System.out.println("✅ Flyway configurado!");
        System.out.println("📦 As migrations serão executadas automaticamente...");
        System.out.println("======================================");
        
        return flyway;
    }
    
    @Bean
    public static BeanFactoryPostProcessor flywayDependencyPostProcessor() {
        return new FlywayDependencyPostProcessor();
    }
    
    private static class FlywayDependencyPostProcessor implements BeanFactoryPostProcessor, PriorityOrdered {
        
        @Override
        public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
            System.out.println("🔧 Configurando ordem de inicialização: Flyway → JPA");
        }
        
        @Override
        public int getOrder() {
            return Ordered.HIGHEST_PRECEDENCE;
        }
    }
}