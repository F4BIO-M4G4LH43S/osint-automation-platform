import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Button, Card, Title, Paragraph, ProgressBar } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useMutation } from '@tanstack/react-query'
import { Formik } from 'formik'
import * as Yup from 'yup'

import { scansApi } from '../../services/api'

const scanSchema = Yup.object().shape({
  target: Yup.string()
    .required('Target is required')
    .matches(
      /^([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3})$/,
      'Invalid domain or IP'
    ),
  modules: Yup.array().min(1, 'Select at least one module'),
})

const modules = [
  { id: 'dns', name: 'DNS', icon: 'dns', description: 'DNS enumeration' },
  { id: 'whois', name: 'WHOIS', icon: 'information', description: 'Domain info' },
  { id: 'crtsh', name: 'Certificates', icon: 'certificate', description: 'SSL certs' },
  { id: 'shodan', name: 'Shodan', icon: 'web', description: 'Internet scan' },
  { id: 'virustotal', name: 'VirusTotal', icon: 'shield-virus', description: 'Reputation' },
  { id: 'wordpress', name: 'WordPress', icon: 'wordpress', description: 'WP security' },
]

const NewScanScreen = () => {
  const navigation = useNavigation()
  const [step, setStep] = useState(1)

  const createScan = useMutation({
    mutationFn: scansApi.create,
    onSuccess: (data) => {
      Alert.alert(
        'Scan Started',
        'Your scan has been initiated successfully.',
        [
          {
            text: 'View Progress',
            onPress: () => navigation.navigate('ScanDetail', { id: data.scan_id }),
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to start scan')
    },
  })

  return (
    <Formik
      initialValues={{
        target: '',
        modules: ['dns', 'whois'],
        options: {
          aggressive: false,
          portScan: false,
        },
      }}
      validationSchema={scanSchema}
      onSubmit={(values) => {
        createScan.mutate(values)
      }}
    >
      {({ handleChange, handleSubmit, values, errors, touched, setFieldValue }) => (
        <View style={styles.container}>
          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <StepIndicator number={1} title="Target" active={step === 1} />
            <View style={styles.progressLine} />
            <StepIndicator number={2} title="Modules" active={step === 2} />
            <View style={styles.progressLine} />
            <StepIndicator number={3} title="Review" active={step === 3} />
          </View>

          <ScrollView style={styles.content}>
            {step === 1 && (
              <View style={styles.stepContent}>
                <Title style={styles.stepTitle}>Enter Target</Title>
                <Paragraph style={styles.stepDescription}>
                  Specify the domain or IP address you want to scan
                </Paragraph>

                <View style={styles.inputContainer}>
                  <Icon name="web" size={24} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="example.com or 192.168.1.1"
                    value={values.target}
                    onChangeText={handleChange('target')}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {touched.target && errors.target && (
                  <Text style={styles.errorText}>{errors.target}</Text>
                )}

                <Card style={styles.tipCard}>
                  <Card.Content>
                    <Text style={styles.tipText}>
                      💡 Tip: For best results, enter the root domain (e.g., example.com) 
                      rather than subdomains.
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            )}

            {step === 2 && (
              <View style={styles.stepContent}>
                <Title style={styles.stepTitle}>Select Modules</Title>
                <Paragraph style={styles.stepDescription}>
                  Choose which OSINT modules to run
                </Paragraph>

                <View style={styles.modulesGrid}>
                  {modules.map((module) => (
                    <TouchableOpacity
                      key={module.id}
                      style={[
                        styles.moduleCard,
                        values.modules.includes(module.id) && styles.moduleCardSelected,
                      ]}
                      onPress={() => {
                        const newModules = values.modules.includes(module.id)
                          ? values.modules.filter(m => m !== module.id)
                          : [...values.modules, module.id]
                        setFieldValue('modules', newModules)
                      }}
                    >
                      <Icon
                        name={module.icon}
                        size={32}
                        color={values.modules.includes(module.id) ? '#3b82f6' : '#6b7280'}
                      />
                      <Text style={[
                        styles.moduleName,
                        values.modules.includes(module.id) && styles.moduleNameSelected,
                      ]}>
                        {module.name}
                      </Text>
                      <Text style={styles.moduleDescription}>{module.description}</Text>
                      
                      {values.modules.includes(module.id) && (
                        <View style={styles.checkmark}>
                          <Icon name="check-circle" size={24} color="#3b82f6" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {touched.modules && errors.modules && (
                  <Text style={styles.errorText}>{errors.modules}</Text>
                )}

                <View style={styles.optionsContainer}>
                  <Text style={styles.optionsTitle}>Advanced Options</Text>
                  
                  <View style={styles.optionRow}>
                    <Text>Aggressive Scanning</Text>
                    <Switch
                      value={values.options.aggressive}
                      onValueChange={(value) => 
                        setFieldValue('options.aggressive', value)
                      }
                    />
                  </View>
                  
                  <View style={styles.optionRow}>
                    <Text>Port Scanning</Text>
                    <Switch
                      value={values.options.portScan}
                      onValueChange={(value) => 
                        setFieldValue('options.portScan', value)
                      }
                    />
                  </View>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.stepContent}>
                <Title style={styles.stepTitle}>Review & Launch</Title>
                
                <Card style={styles.reviewCard}>
                  <Card.Content>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Target</Text>
                      <Text style={styles.reviewValue}>{values.target}</Text>
                    </View>
                    
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Modules</Text>
                      <Text style={styles.reviewValue}>
                        {values.modules.length} selected
                      </Text>
                    </View>
                    
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Options</Text>
                      <Text style={styles.reviewValue}>
                        {values.options.aggressive ? 'Aggressive' : 'Standard'}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                <Card style={styles.estimateCard}>
                  <Card.Content>
                    <Text style={styles.estimateTitle}>⏱️ Estimated Time</Text>
                    <Text style={styles.estimateValue}>
                      {values.modules.length * 2}-{values.modules.length * 5} minutes
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            )}
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {step > 1 && (
              <Button
                mode="outlined"
                onPress={() => setStep(step - 1)}
                style={styles.backButton}
              >
                Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button
                mode="contained"
                onPress={() => setStep(step + 1)}
                style={styles.nextButton}
                disabled={step === 1 && !values.target}
              >
                Next
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={createScan.isPending}
                disabled={createScan.isPending}
                style={[styles.nextButton, { backgroundColor: '#10b981' }]}
              >
                Launch Scan
              </Button>
            )}
          </View>
        </View>
      )}
    </Formik>
  )
}

const StepIndicator = ({ number, title, active }) => (
  <View style={styles.stepIndicator}>
    <View style={[
      styles.stepCircle,
      active && styles.stepCircleActive,
    ]}>
      <Text style={[
        styles.stepNumber,
        active && styles.stepNumberActive,
      ]}>
        {number}
      </Text>
    </View>
    <Text style={[
      styles.stepLabel,
      active && styles.stepLabelActive,
    ]}>
      {title}
    </Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#3b82f6',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  stepLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  stepDescription: {
    color: '#6b7280',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 8,
    fontSize: 14,
  },
  tipCard: {
    marginTop: 24,
    backgroundColor: '#eff6ff',
  },
  tipText: {
    color: '#1e40af',
    fontSize: 14,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  moduleCard: {
    width: '46%',
    margin: '2%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    position: 'relative',
  },
  moduleCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  moduleName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  moduleNameSelected: {
    color: '#3b82f6',
  },
  moduleDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  optionsContainer: {
    marginTop: 24,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reviewCard: {
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  reviewLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  reviewValue: {
    fontWeight: '600',
    fontSize: 14,
  },
  estimateCard: {
    backgroundColor: '#f0fdf4',
  },
  estimateTitle: {
    fontSize: 14,
    color: '#166534',
  },
  estimateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    flex: 1,
    marginRight: 12,
  },
  nextButton: {
    flex: 2,
  },
})

export default NewScanScreen
