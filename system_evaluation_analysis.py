import pandas as pd
import numpy as np

# Define the rating scale mapping
rating_scale = {
    'Strongly Agree': 5,
    'Agree': 4,
    'Neutral': 3,
    'Disagree': 2,
    'Strongly Disagree': 1
}

# Raw survey data
survey_data = [
    ['Strongly Agree', 'Agree', 'Strongly Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Strongly Agree', 'Agree', 'Strongly Agree', 'Agree'],
    ['Agree', 'Neutral', 'Neutral', 'Strongly Agree', 'Strongly Agree', 'Agree', 'Strongly Agree', 'Strongly Agree', 'Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Neutral'],
    ['Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Agree', 'Strongly Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Neutral'],
    ['Neutral', 'Agree', 'Agree', 'Strongly Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Strongly Agree', 'Agree'],
    ['Agree', 'Agree', 'Strongly Agree', 'Strongly Agree', 'Neutral', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Agree', 'Agree', 'Agree', 'Agree', 'Strongly Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Agree', 'Strongly Agree', 'Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree'],
    ['Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree', 'Strongly Agree']
]

# Define the criteria labels
criteria = [
    'Reliability [The system can recover quickly if there is an error or disconnection.]',
    'Security [My personal and payment information is kept private.]',
    'Security [My rental history and account data are accurate.]',
    'Security [The system provides records of my rentals and payments.]',
    'Security [My actions are logged properly.]',
    'Security [The system correctly verifies my identity when I log in.]',
    'Maintainability [The system appears well-structured and stable without unexpected behavior.]',
    'Maintainability [Features could easily be reused for future transportation modes.]',
    'Maintainability [Problems are easy for support to identify and resolve.]',
    'Maintainability [The system can be updated or modified with improvements.]',
    'Maintainability [The system performs reliably in different situations.]',
    'Portability [The bike rental system works well on different devices.]',
    'Portability [I was able to easily install and use the bike rental application.]',
    'Portability [I can switch devices and continue using the system without problems.]'
]

# Convert text ratings to numerical values
numerical_data = []
for response in survey_data:
    numerical_response = [rating_scale[rating] for rating in response]
    numerical_data.append(numerical_response)

# Convert to numpy array for easier calculations
data_array = np.array(numerical_data)

# Calculate statistics for each criterion
print("SYSTEM EVALUATION ANALYSIS")
print("=" * 80)
print(f"Total Respondents: {len(survey_data)}")
print(f"Total Criteria: {len(criteria)}")
print()

# Create a DataFrame for better presentation
df_results = pd.DataFrame(columns=['Criterion', 'Mean', 'Std Dev', 'Min', 'Max', 'Mode'])

for i, criterion in enumerate(criteria):
    criterion_scores = data_array[:, i]
    mean_score = np.mean(criterion_scores)
    std_dev = np.std(criterion_scores, ddof=1)  # Sample standard deviation
    min_score = np.min(criterion_scores)
    max_score = np.max(criterion_scores)
    mode_score = np.bincount(criterion_scores).argmax()
    
    df_results.loc[i] = [
        criterion,
        round(mean_score, 3),
        round(std_dev, 3),
        min_score,
        max_score,
        mode_score
    ]

# Display results
print("DETAILED STATISTICS BY CRITERION:")
print("-" * 80)
for _, row in df_results.iterrows():
    print(f"\n{row['Criterion']}")
    print(f"  Mean: {row['Mean']:.3f}")
    print(f"  Standard Deviation: {row['Std Dev']:.3f}")
    print(f"  Range: {row['Min']} - {row['Max']}")
    print(f"  Mode: {row['Mode']}")

# Overall statistics
print("\n" + "=" * 80)
print("OVERALL SYSTEM EVALUATION STATISTICS")
print("=" * 80)

overall_mean = np.mean(data_array)
overall_std = np.std(data_array, ddof=1)
overall_min = np.min(data_array)
overall_max = np.max(data_array)

print(f"Overall Mean Score: {overall_mean:.3f}")
print(f"Overall Standard Deviation: {overall_std:.3f}")
print(f"Overall Range: {overall_min} - {overall_max}")

# Calculate mean and std for each category
reliability_scores = data_array[:, 0]
security_scores = data_array[:, 1:6]  # Columns 1-5
maintainability_scores = data_array[:, 6:11]  # Columns 6-10
portability_scores = data_array[:, 11:14]  # Columns 11-13

print(f"\nReliability Mean: {np.mean(reliability_scores):.3f} (Std: {np.std(reliability_scores, ddof=1):.3f})")
print(f"Security Mean: {np.mean(security_scores):.3f} (Std: {np.std(security_scores, ddof=1):.3f})")
print(f"Maintainability Mean: {np.mean(maintainability_scores):.3f} (Std: {np.std(maintainability_scores, ddof=1):.3f})")
print(f"Portability Mean: {np.mean(portability_scores):.3f} (Std: {np.std(portability_scores, ddof=1):.3f})")

# Rating distribution
print(f"\nRATING DISTRIBUTION:")
print("-" * 40)
unique, counts = np.unique(data_array, return_counts=True)
total_responses = len(data_array) * len(criteria)
for rating, count in zip(unique, counts):
    percentage = (count / total_responses) * 100
    rating_text = {1: 'Strongly Disagree', 2: 'Disagree', 3: 'Neutral', 4: 'Agree', 5: 'Strongly Agree'}[rating]
    print(f"{rating_text}: {count} ({percentage:.1f}%)")

print(f"\nTotal Responses: {total_responses}")
